import type {
  Fidelity,
  RewriteResult,
  StyleMode,
  StyleProfile,
} from "@/types";
import { extractAll } from "@/scoring/extractors";
import { scoreText } from "@/scoring/scorer";
import type { ScoreReport } from "@/scoring/scorer";

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
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([，。！？、；：])/g, "$1")
    .replace(/([，。！？])[ \t]*/g, "$1")
    .replace(/，+/g, "，")
    .replace(/^[ \t，。]+/, "")
    .replace(/[，。][ \t]*([。！？])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

// 本地仅负责保底展示。真正的风格改写由 Worker 模型完成。
function mineRewrite(input: string, profile?: StyleProfile): {
  text: string;
  compensations: number;
  report: ScoreReport | null;
} {
  if (!profile?.baseline) return { text: input, compensations: 0, report: null };
  const features = extractAll(input, profile.scenario ?? "social_post");
  return {
    text: input,
    compensations: 0,
    report: scoreText(features, profile.baseline),
  };
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
      fidelity = "low";
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
