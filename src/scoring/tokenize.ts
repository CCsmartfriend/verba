// 文本预处理：清洗、分段、分句、分词
// 无外部 NLP 依赖，纯规则实现（文档 10.2 MVP 范围）

// 句末标点
const SENTENCE_END = /[。！？!?]/;

// 清洗：统一中英文标点、去多余空白
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// 分段：按换行切分，过滤空段
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// 分句：按句末标点切分，保留标点
export function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\n+/g, "");
  const result: string[] = [];
  let buf = "";
  for (const ch of cleaned) {
    buf += ch;
    if (SENTENCE_END.test(ch)) {
      const s = buf.trim();
      if (s) result.push(s);
      buf = "";
    }
  }
  const tail = buf.trim();
  if (tail) result.push(tail);
  return result;
}

// 句子字符数（不含标点与空白，用于句长统计）
export function sentenceChars(s: string): string {
  return s.replace(/[\s。，、；：！？!?.,;:""''""（）()[\]【】《》—…·-]/g, "");
}

// 总字数：去空白后的字符数
export function totalChars(text: string): number {
  return text.replace(/\s/g, "").length;
}

// 简易中文分词：基于词典最大匹配 + 回退到字符
// 仅用于 TTR、高频词等需要"词"单位的指标
// 词典为内置常见词，回退单字
const COMMON_DICT = [
  "我们", "你们", "他们", "她们", "它们", "一个", "什么", "怎么", "为什么",
  "因为", "所以", "因此", "但是", "不过", "然而", "而且", "不仅", "其实",
  "就是", "还是", "或者", "可能", "应该", "可以", "需要", "觉得", "认为",
  "发现", "问题", "时候", "地方", "东西", "事情", "方式", "方法", "时候",
  "现在", "之前", "之后", "最近", "今天", "昨天", "明天", "一些", "这些",
  "那些", "自己", "别人", "大家", "真正", "决定", "结果", "开始", "可能",
  "重要", "关键", "核心", "本质", "如果", "即使", "尽管", "而是", "不如",
  "与其", "一方面", "另一方面", "换句话说", "也就是说", "这意味着",
  "真正的问题", "创作", "内容", "产品", "用户", "表达", "风格", "习惯",
  "系统", "分析", "评估", "维度", "特征", "基线", "样本", "场景",
];

const DICT_SET = new Set(COMMON_DICT);
const DICT_MAX_LEN = 6;

// 正向最大匹配分词
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const cleaned = text.replace(/\s+/g, "");
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    // 英文/数字连成一个 token
    if (/[a-zA-Z0-9]/.test(ch)) {
      let j = i + 1;
      while (j < cleaned.length && /[a-zA-Z0-9]/.test(cleaned[j])) j++;
      tokens.push(cleaned.slice(i, j).toLowerCase());
      i = j;
      continue;
    }
    // 中文：最大匹配
    let matched = false;
    for (let len = DICT_MAX_LEN; len > 1; len--) {
      const word = cleaned.slice(i, i + len);
      if (word.length === len && DICT_SET.has(word)) {
        tokens.push(word);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push(ch);
      i += 1;
    }
  }
  return tokens;
}

// 词典最长匹配计数：长词优先，避免短词误命中
// 返回总命中次数（非重叠）
export function countDictMatches(text: string, dict: string[]): number {
  if (dict.length === 0) return 0;
  const sorted = [...dict].sort((a, b) => b.length - a.length);
  // 用占位标记已匹配区间，避免重叠计数
  const chars = Array.from(text);
  const mask = new Array(chars.length).fill(false);
  let count = 0;
  for (const word of sorted) {
    if (!word) continue;
    const wChars = Array.from(word);
    let idx = 0;
    while (idx <= chars.length - wChars.length) {
      let ok = true;
      for (let k = 0; k < wChars.length; k++) {
        if (mask[idx + k] || chars[idx + k] !== wChars[k]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        for (let k = 0; k < wChars.length; k++) mask[idx + k] = true;
        count += 1;
        idx += wChars.length;
      } else {
        idx += 1;
      }
    }
  }
  return count;
}

// 词典各词命中次数（用于高频词排序）
export function dictFrequency(text: string, dict: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of dict) {
    if (!w) continue;
    const re = new RegExp(escapeRegExp(w), "g");
    const m = text.match(re);
    if (m) map.set(w, m.length);
  }
  return map;
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
