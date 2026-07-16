import type {
  Fidelity,
  RewriteResult,
  StyleMode,
  StyleProfile,
} from "@/types";
import { extractAll } from "@/scoring/extractors";
import { scoreText } from "@/scoring/scorer";
import type { AllFeatures } from "@/scoring/extractors";
import type { ScoreReport } from "@/scoring/scorer";
import { splitSentences } from "@/scoring/tokenize";

// AI 腔短语移除/替换（去 AI 味模式 + 风格改写通用）
const AI_PHRASES: Array<[RegExp, string]> = [
  [/综上所述[，,]?/g, ""],
  [/总而言之[，,]?/g, ""],
  [/值得注意的是[，,]?/g, ""],
  [/不难发现[，,]?/g, ""],
  [/众所周知[，,]?/g, ""],
  [/在当今社会[，,]?/g, ""],
  [/随着[^，。]{0,12}的不断发展[，,]?/g, ""],
  [/首先[，,]/g, ""],
  [/其次[，,]/g, ""],
  [/最后[，,]/g, "另外"],
  [/因此[，,]/g, "所以"],
  [/此外[，,]/g, "另外"],
  [/然而[，,]/g, "但"],
  [/进行了一次/g, "做了一次"],
  [/实现了/g, "做到了"],
  [/不仅[^。]{0,12}而且/g, "同时"],
];

// 书面→口语化替换
const HUMANIZE_MAP: Array<[RegExp, string]> = [
  [/笔者/g, "我"],
  [/本人/g, "我"],
  [/予以/g, "给"],
  [/诸多/g, "很多"],
  [/鉴于/g, "考虑到"],
  [/旨在/g, "想"],
  [/具备/g, "有"],
  [/亦/g, "也"],
  [/即可/g, "就行"],
  [/较为/g, "比较"],
  [/此外/g, "另外"],
  [/然而/g, "但"],
];

// 冗余可删词
const FILLER_WORDS = [
  "其实",
  "说实话",
  "老实说",
  "不得不说",
  "总的来说",
  "从某种意义上说",
];

function dedupeSpace(s: string): string {
  return s
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([，。！？、；：])/g, "$1")
    .replace(/([，。！？])\s*/g, "$1")
    .replace(/，+/g, "，")
    .replace(/^[\s，。]+/, "")
    .replace(/[，。]\s*([。！？])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// 应用禁用词：移除用户标记为"不想出现"的词
function applyBannedWords(text: string, banned: string[]): string {
  if (!banned.length) return text;
  let out = text;
  for (const w of banned) {
    if (!w) continue;
    out = out.replace(new RegExp(escapeRegExp(w) + "[，,]?", "g"), "");
  }
  return dedupeSpace(out);
}

function profileAvoidsNotBut(profile?: StyleProfile): boolean {
  const boundaries = profile?.profileMeta?.boundaries ?? "";
  return /(不喜欢|避免|不要|少用|禁用|不用).{0,12}(不是.{0,4}而是|不是而是|不是)/.test(
    boundaries,
  );
}

function removeNotButPattern(text: string): string {
  return dedupeSpace(
    text
      .replace(/不只是([^。！？\n]{1,40})，?而是/g, "除了$1，更重要的是")
      .replace(/不仅是([^。！？\n]{1,40})，?而是/g, "除了$1，更重要的是")
      .replace(/不是([^。！？\n]{1,40})，?而是/g, "更准确地说，是")
      .replace(/并不是([^。！？\n]{1,40})，?而是/g, "更准确地说，是")
      .replace(/，?而不是/g, "，也少不了"),
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==================== 基础改写动作 ====================

// 去 AI 味：移除模板短语 + 口语化
function deaiRewrite(input: string): string {
  let out = input;
  AI_PHRASES.forEach(([re, rep]) => {
    out = out.replace(re, rep);
  });
  HUMANIZE_MAP.forEach(([re, rep]) => {
    out = out.replace(re, rep);
  });
  out = out.replace(/！{2,}/g, "。");
  return dedupeSpace(out).trim();
}

// 缩短：去冗词 + 精简
function shortenRewrite(input: string): string {
  let out = input;
  FILLER_WORDS.forEach((w) => {
    out = out.replace(new RegExp(w + "[，,]?", "g"), "");
  });
  out = out.replace(/的[^，。！？]{0,6}的/g, "的");
  out = out.replace(/([^\s，。！？]{1,3})，([^\s，。！？]{1,3})，/g, "$1，$2 ");
  return dedupeSpace(out).trim();
}

// 公众号风格：分段 + 开头钩子 + 结尾互动
function wechatRewrite(input: string): string {
  const cleaned = dedupeSpace(input).trim();
  const paras = cleaned
    .split(/(?<=[。！？])/)
    .filter((s) => s.trim().length > 0);
  const grouped: string[] = [];
  for (let i = 0; i < paras.length; i += 2) {
    grouped.push(paras.slice(i, i + 2).join("").trim());
  }
  const body = grouped.join("\n\n");
  const hook = "写这篇文章的时候，我一直在想一个问题：";
  const cta = "\n\n你怎么看？欢迎在评论区聊聊。";
  return `${hook}${body}${cta}`;
}

// ==================== 评分驱动的补偿式改写（改成我的风格） ====================

// 单条补偿规则：针对某个偏离维度做调整
interface Compensation {
  dim: string;
  apply: (text: string, features: AllFeatures, baseline: StyleProfile["baseline"]) => string;
}

// 补偿规则集：覆盖规则引擎能调的维度
const COMPENSATIONS: Compensation[] = [
  // 句长与节奏：句子过长则切短
  {
    dim: "sentence_rhythm",
    apply: (text, features, baseline) => {
      const baseAvg = baseline?.numeric["sentence_rhythm.avg_sentence_length"]?.mean ?? 24;
      const curAvg = features.sentence_rhythm.avg_sentence_length;
      if (curAvg <= baseAvg + 4) return text;
      // 切分长句：把超过 baseAvg*1.6 的子句在逗号处断为句
      const threshold = Math.max(18, baseAvg * 1.5);
      let out = text;
      // 在长句中的某个逗号改句号
      const sentences = splitSentences(out);
      const rebuilt = sentences.map((s) => {
        const chars = s.replace(/[\s，。！？、；：]/g, "");
        if (chars.length < threshold) return s;
        // 找到中间附近的逗号，替换为句号
        const commaIdx: number[] = [];
        for (let i = 0; i < s.length; i++) if (s[i] === "，") commaIdx.push(i);
        if (commaIdx.length === 0) return s;
        const mid = commaIdx[Math.floor(commaIdx.length / 2)];
        return s.slice(0, mid) + "。" + s.slice(mid + 1);
      });
      out = rebuilt.join("");
      return out;
    },
  },
  // 词汇习惯：去 AI 腔 + 口语化
  {
    dim: "lexical_habits",
    apply: (text, features) => {
      if (features.lexical_habits.ai_cliche_per_1000 <= 1) return text;
      return deaiRewrite(text);
    },
  },
  // 标点习惯：连续感叹号归一
  {
    dim: "punctuation_habits",
    apply: (text) => {
      let out = text.replace(/！{2,}/g, "。");
      // 中英文标点统一
      out = out.replace(/,/g, "，").replace(/\./g, "。");
      return out;
    },
  },
  // 人称使用：缺少第一人称时注入
  {
    dim: "pronoun_usage",
    apply: (text, features, baseline) => {
      const baseFirst = baseline?.numeric["pronoun_usage.first_person_singular_per_1000"]?.mean ?? 0;
      const curFirst = features.pronoun_usage.first_person_singular_per_1000;
      if (curFirst >= baseFirst || baseFirst < 2) return text;
      // 在第一句后注入"我觉得"/"我的感受是"
      if (/我/.test(text)) return text;
      return text.replace(/^([^\s]{0,12}[，。])/, "$1我的感受是，");
    },
  },
  // 功能词与连接词：缺少转折词时注入
  {
    dim: "function_words_connectors",
    apply: (text, features, baseline) => {
      const baseContrast = baseline?.numeric["function_words_connectors.contrast_per_sentence"]?.mean ?? 0;
      const curContrast = features.function_words_connectors.contrast_per_sentence;
      if (curContrast >= baseContrast || baseContrast < 0.1) return text;
      // 在中段某个句号前加转折
      const sentences = splitSentences(text);
      if (sentences.length < 3) return text;
      const idx = Math.floor(sentences.length / 2);
      sentences[idx] = "但" + sentences[idx].replace(/^但[，,]?/, "");
      return sentences.join("");
    },
  },
  // 段落结构：单段过长则拆段
  {
    dim: "paragraph_structure",
    apply: (text, features) => {
      if (features.paragraph_structure.avg_paragraph_chars < 120) return text;
      // 按 2-3 句一段重新分段
      const sentences = splitSentences(text);
      const groups: string[] = [];
      for (let i = 0; i < sentences.length; i += 2) {
        groups.push(sentences.slice(i, i + 2).join(""));
      }
      return groups.join("\n\n");
    },
  },
  // 语气情绪：弱化过强的命令/强判断
  {
    dim: "tone_emotion",
    apply: (text, features) => {
      if (features.tone_emotion.strong_judgment_per_sentence < 0.3) return text;
      const out = text
        .replace(/必须/g, "最好")
        .replace(/绝对/g, "多半")
        .replace(/毫无疑问[，,]?/g, "")
        .replace(/一定/g, "尽量");
      return out;
    },
  },
];

// 评分驱动的"改成我的风格"
function mineRewrite(input: string, profile?: StyleProfile): {
  text: string;
  compensations: number;
  report: ScoreReport | null;
} {
  let text = input;
  // 先做一轮基础去 AI 味
  text = deaiRewrite(text);

  if (!profile?.baseline) {
    // 无基线：只做去 AI 味 + 口语化，无评分
    return { text, compensations: 1, report: null };
  }

  const baseline = profile.baseline;
  const scenario = profile.scenario ?? "social_post";

  // 迭代补偿：最多两轮，每轮评分→找偏离维度→施加补偿
  let appliedCount = 0;
  const appliedDims = new Set<string>();
  for (let round = 0; round < 2; round++) {
    const features = extractAll(text, scenario);
    const report = scoreText(features, baseline);
    // 找出偏离最大的维度（分数最低且尚未补偿过）
    const lowDims = report.dimensions
      .filter((d) => d.score < 70 && !appliedDims.has(d.key))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
    if (lowDims.length === 0) break;
    let changed = false;
    for (const dim of lowDims) {
      const comp = COMPENSATIONS.find((c) => c.dim === dim.key);
      if (!comp) continue;
      const before = text;
      text = comp.apply(text, features, baseline);
      if (text !== before) {
        appliedDims.add(dim.key);
        appliedCount++;
        changed = true;
      }
    }
    if (!changed) break;
  }

  // 应用禁用词
  text = applyBannedWords(text, profile.bannedWords ?? []);
  if (profileAvoidsNotBut(profile)) {
    text = removeNotButPattern(text);
  }
  text = dedupeSpace(text).trim();

  // 最终评分
  const finalFeatures = extractAll(text, scenario);
  const finalReport = scoreText(finalFeatures, baseline);

  return { text, compensations: appliedCount, report: finalReport };
}

// ==================== 主入口 ====================

export function rewrite(
  input: string,
  mode: StyleMode,
  profile?: StyleProfile,
): RewriteResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      text: "",
      rulesApplied: 0,
      fidelity: "review",
      platform: "—",
      compensations: 0,
      report: null,
    };
  }

  let text = trimmed;
  let platform = "通用";
  let fidelity: Fidelity = "review";
  let compensations = 0;
  let report: ScoreReport | null = null;

  switch (mode) {
    case "mine": {
      const r = mineRewrite(trimmed, profile);
      text = r.text;
      platform = profile ? profile.name : "默认风格";
      fidelity = profile ? "high" : "review";
      compensations = r.compensations;
      report = r.report;
      break;
    }
    case "deai":
      text = deaiRewrite(trimmed);
      platform = "通用";
      fidelity = "high";
      break;
    case "shorten":
      text = shortenRewrite(trimmed);
      platform = "通用";
      fidelity = "review";
      break;
    case "wechat":
      text = wechatRewrite(trimmed);
      platform = "公众号";
      fidelity = "review";
      break;
  }

  // 非 mine 模式也尝试评分（若有基线）
  if (mode !== "mine" && profile?.baseline) {
    const scenario = profile.scenario ?? "social_post";
    const f = extractAll(text, scenario);
    report = scoreText(f, profile.baseline);
  }

  if (text.length < Math.max(4, trimmed.length * 0.4)) {
    fidelity = "low";
  }

  const rulesApplied = Math.min(
    (mode === "mine" ? 2 : 0) + (profile?.rulesCount ?? 0) + compensations + 3,
    12,
  );

  return {
    text,
    rulesApplied,
    fidelity,
    platform,
    compensations,
    report,
  };
}

export function modeLabel(mode: StyleMode): string {
  switch (mode) {
    case "mine":
      return "改成我的风格";
    case "deai":
      return "去 AI 味";
    case "shorten":
      return "缩短";
    case "wechat":
      return "公众号风格";
  }
}

// 编辑差异估算
export function estimateDiff(a: string, b: string): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  const setA = new Set(a);
  const setB = new Set(b);
  let diff = Math.abs(la - lb);
  setA.forEach((c) => {
    if (!setB.has(c)) diff += 1;
  });
  return diff;
}

// 对编辑前后的文本评分对比，生成学习信号
export interface EditLearnSignal {
  originalScore: number;
  editedScore: number;
  delta: number;
  improvedDims: { label: string; delta: number }[];
  regressedDims: { label: string; delta: number }[];
}

export function analyzeEdit(
  original: string,
  edited: string,
  profile: StyleProfile,
): EditLearnSignal | null {
  if (!profile.baseline) return null;
  const scenario = profile.scenario ?? "social_post";
  const fOrig = extractAll(original, scenario);
  const fEdit = extractAll(edited, scenario);
  const rOrig = scoreText(fOrig, profile.baseline);
  const rEdit = scoreText(fEdit, profile.baseline);
  const map = new Map(rOrig.dimensions.map((d) => [d.key, d.score]));
  const improved: { label: string; delta: number }[] = [];
  const regressed: { label: string; delta: number }[] = [];
  for (const d of rEdit.dimensions) {
    const prev = map.get(d.key) ?? 0;
    const delta = d.score - prev;
    if (delta >= 5) improved.push({ label: d.label, delta });
    else if (delta <= -5) regressed.push({ label: d.label, delta });
  }
  return {
    originalScore: rOrig.overall,
    editedScore: rEdit.overall,
    delta: rEdit.overall - rOrig.overall,
    improvedDims: improved.sort((a, b) => b.delta - a.delta).slice(0, 3),
    regressedDims: regressed.sort((a, b) => a.delta - b.delta).slice(0, 3),
  };
}
