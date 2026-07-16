// 12 个特征提取器（来源：技术文档第 6 节）
// 每个 extractor 输入文本，输出该维度的特征对象
import {
  AI_CLICHE_WORDS,
  CASE_DRIVER_WORDS,
  CAUSAL_WORDS,
  COLLOQUIAL_WORDS,
  COMMAND_WORDS,
  CONCEPT_DRIVER_WORDS,
  CONTRAST_WORDS,
  CONCLUSION_TRIGGERS,
  COUNTERINTUITIVE_TRIGGERS,
  DATA_DRIVER_WORDS,
  EXAMPLE_WORDS,
  EXAGGERATION_WORDS,
  FORMAL_WORDS,
  FIRST_PERSON_PLURAL,
  FIRST_PERSON_SINGULAR,
  HEDGING_WORDS,
  HUMOR_WORDS,
  INFECTIOUS_WORDS,
  METHOD_DRIVER_WORDS,
  NEGATIVE_WORDS,
  POSITIVE_WORDS,
  PROBLEM_DRIVER_WORDS,
  PROGRESSIVE_WORDS,
  QUESTION_TRIGGERS,
  READER_POINTING,
  SECOND_PERSON,
  SELF_EXPERIENCE,
  STOP_WORDS,
  STRONG_JUDGMENT_WORDS,
  SUGGESTION_WORDS,
  SUMMARY_WORDS,
  STORY_TRIGGERS,
  WEAK_JUDGMENT_WORDS,
} from "@/scoring/dictionaries";
import { SENTENCE_PATTERNS } from "@/scoring/patterns";
import {
  cleanText,
  countDictMatches,
  sentenceChars,
  splitParagraphs,
  splitSentences,
  tokenize,
  totalChars,
} from "@/scoring/tokenize";

const LIST_MARKER_RE = /^[\d一二三四五六七八九十]+[.、)）]|^[•—●-]\s/m;

export interface TextUnit {
  raw: string;
  paragraphs: string[];
  sentences: string[];
  tokens: string[];
}

// 预处理文本，产出统一输入单元
export function preprocess(text: string): TextUnit {
  const raw = cleanText(text);
  const paragraphs = splitParagraphs(raw);
  const sentences = splitSentences(raw);
  const tokens = tokenize(raw);
  return { raw, paragraphs, sentences, tokens };
}

// ==================== 6.1 文本长度与结构 ====================
export function extractLengthStructure(unit: TextUnit) {
  const chars = totalChars(unit.raw);
  const sentenceCount = unit.sentences.length;
  const paragraphCount = unit.paragraphs.length;
  const avgCharsPerParagraph = paragraphCount > 0 ? chars / paragraphCount : 0;
  const avgSentencesPerParagraph =
    paragraphCount > 0 ? sentenceCount / paragraphCount : 0;
  // 小标题：以 # 开头或独占一行且短（≤12字）无标点
  const headingCount = unit.paragraphs.filter((p) =>
    /^#{1,6}\s|^[一二三四五六七八九十]+[、.．]/.test(p) ||
    (p.length <= 12 && !/[。！？，；]/.test(p) && /^[^\d\s]/.test(p)),
  ).length;
  // 列表行
  const listCount = unit.paragraphs.filter((p) =>
    LIST_MARKER_RE.test(p) || /^[（(][一二三四五六七八九十]+[)）]/.test(p),
  ).length;
  return {
    total_chars: chars,
    sentence_count: sentenceCount,
    paragraph_count: paragraphCount,
    avg_chars_per_paragraph: avgCharsPerParagraph,
    avg_sentences_per_paragraph: avgSentencesPerParagraph,
    heading_count: headingCount,
    list_count: listCount,
  };
}

// ==================== 6.2 句长与节奏 ====================
export function extractSentenceRhythm(unit: TextUnit) {
  const lengths = unit.sentences.map((s) => sentenceChars(s).length);
  const n = lengths.length;
  if (n === 0) {
    return {
      avg_sentence_length: 0,
      median_sentence_length: 0,
      max_sentence_length: 0,
      short_sentence_ratio: 0,
      long_sentence_ratio: 0,
      sentence_length_std: 0,
      alternation_rate: 0,
    };
  }
  const sorted = [...lengths].sort((a, b) => a - b);
  const mean = lengths.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(
    lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / n,
  );
  const shortCount = lengths.filter((l) => l < 15).length;
  const longCount = lengths.filter((l) => l > 35).length;
  // 长短句交替率
  const cats = lengths.map((l) => (l < 15 ? "S" : l > 35 ? "L" : "M"));
  let alt = 0;
  for (let i = 1; i < cats.length; i++) {
    if (cats[i] !== cats[i - 1]) alt++;
  }
  const altRate = n > 1 ? alt / (n - 1) : 0;
  return {
    avg_sentence_length: mean,
    median_sentence_length: sorted[Math.floor(n / 2)],
    max_sentence_length: Math.max(...lengths),
    short_sentence_ratio: shortCount / n,
    long_sentence_ratio: longCount / n,
    sentence_length_std: std,
    alternation_rate: altRate,
  };
}

// ==================== 6.3 段落结构 ====================
export function extractParagraphStructure(unit: TextUnit) {
  const paras = unit.paragraphs;
  const n = paras.length;
  if (n === 0) {
    return {
      avg_paragraph_chars: 0,
      single_sentence_paragraph_ratio: 0,
      short_paragraph_ratio: 0,
      long_paragraph_ratio: 0,
      list_paragraph_ratio: 0,
    };
  }
  const paraLens = paras.map((p) => totalChars(p));
  const mean = paraLens.reduce((a, b) => a + b, 0) / n;
  const singleSent = paras.filter((p) => {
    const s = splitSentences(p);
    return s.length <= 1;
  }).length;
  const shortPara = paraLens.filter((l) => l < 20).length;
  const longPara = paraLens.filter((l) => l > 120).length;
  const listPara = paras.filter((p) => LIST_MARKER_RE.test(p)).length;
  return {
    avg_paragraph_chars: mean,
    single_sentence_paragraph_ratio: singleSent / n,
    short_paragraph_ratio: shortPara / n,
    long_paragraph_ratio: longPara / n,
    list_paragraph_ratio: listPara / n,
  };
}

// ==================== 6.4 标点习惯 ====================
function punctFreq(text: string, chars: number, re: RegExp): number {
  if (chars === 0) return 0;
  const m = text.match(re);
  return ((m ? m.length : 0) / chars) * 1000;
}

export function extractPunctuation(unit: TextUnit) {
  const chars = totalChars(unit.raw);
  const t = unit.raw;
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
  return {
    comma_per_1000: punctFreq(t, chars, /[，,]/g),
    period_per_1000: punctFreq(t, chars, /[。.]/g),
    question_per_1000: punctFreq(t, chars, /[？?]/g),
    exclamation_per_1000: punctFreq(t, chars, /[！!]/g),
    colon_per_1000: punctFreq(t, chars, /[：:]/g),
    semicolon_per_1000: punctFreq(t, chars, /[；;]/g),
    dash_per_1000: punctFreq(t, chars, /[—–-]/g),
    parentheses_per_1000: punctFreq(t, chars, /[（()）]/g),
    quote_per_1000: punctFreq(t, chars, /[""''""「」『』]/g),
    ellipsis_per_1000: punctFreq(t, chars, /[…]/g),
    emoji_per_1000: punctFreq(t, chars, emojiRe),
  };
}

// ==================== 6.5 词汇习惯 ====================
export function extractLexical(unit: TextUnit) {
  const chars = totalChars(unit.raw);
  const tokens = unit.tokens;
  const wordCount = tokens.length || 1;
  // TTR
  const uniqueTokens = new Set(tokens);
  const ttr = uniqueTokens.size / wordCount;
  // 高频词（去停用词，取 Top 20）
  const freq = new Map<string, number>();
  for (const tk of tokens) {
    if (STOP_WORDS.has(tk) || tk.length < 2) continue;
    freq.set(tk, (freq.get(tk) ?? 0) + 1);
  }
  const topKeywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w]) => w);
  // 各类词频率（按总字数归一，每千字）
  const colloqRate = (countDictMatches(unit.raw, COLLOQUIAL_WORDS) / Math.max(chars, 1)) * 1000;
  const formalRate = (countDictMatches(unit.raw, FORMAL_WORDS) / Math.max(chars, 1)) * 1000;
  const aiClicheRate = (countDictMatches(unit.raw, AI_CLICHE_WORDS) / Math.max(chars, 1)) * 1000;
  return {
    top_keywords: topKeywords,
    ttr,
    colloquial_per_1000: colloqRate,
    formal_per_1000: formalRate,
    ai_cliche_per_1000: aiClicheRate,
  };
}

// ==================== 6.6 功能词与连接词 ====================
export function extractConnectors(unit: TextUnit) {
  const sCount = Math.max(unit.sentences.length, 1);
  return {
    contrast_per_sentence: countDictMatches(unit.raw, CONTRAST_WORDS) / sCount,
    causal_per_sentence: countDictMatches(unit.raw, CAUSAL_WORDS) / sCount,
    progressive_per_sentence: countDictMatches(unit.raw, PROGRESSIVE_WORDS) / sCount,
    summary_per_sentence: countDictMatches(unit.raw, SUMMARY_WORDS) / sCount,
    example_per_sentence: countDictMatches(unit.raw, EXAMPLE_WORDS) / sCount,
    hedging_per_sentence: countDictMatches(unit.raw, HEDGING_WORDS) / sCount,
  };
}

// ==================== 6.7 人称使用 ====================
export function extractPronoun(unit: TextUnit) {
  const chars = Math.max(totalChars(unit.raw), 1);
  const sCount = Math.max(unit.sentences.length, 1);
  return {
    first_person_singular_per_1000: (countDictMatches(unit.raw, FIRST_PERSON_SINGULAR) / chars) * 1000,
    first_person_plural_per_1000: (countDictMatches(unit.raw, FIRST_PERSON_PLURAL) / chars) * 1000,
    second_person_per_1000: (countDictMatches(unit.raw, SECOND_PERSON) / chars) * 1000,
    self_experience_per_sentence: countDictMatches(unit.raw, SELF_EXPERIENCE) / sCount,
    reader_pointing_per_sentence: countDictMatches(unit.raw, READER_POINTING) / sCount,
  };
}

// ==================== 6.8 句式模式 ====================
export function extractSentencePatterns(unit: TextUnit) {
  const sCount = Math.max(unit.sentences.length, 1);
  const result: Record<string, number> = {};
  for (const [key, patterns] of Object.entries(SENTENCE_PATTERNS)) {
    let count = 0;
    for (const re of patterns) {
      const m = unit.raw.match(re);
      if (m) count += m.length;
    }
    result[`${key}_per_sentence`] = count / sCount;
  }
  return result;
}

// ==================== 6.9 篇章组织结构 ====================
export function extractDiscourse(unit: TextUnit) {
  const firstPara = unit.paragraphs[0] ?? "";
  const openingType = detectOpening(firstPara);
  const developmentType = detectDevelopment(unit);
  const endingType = detectEnding(unit.paragraphs[unit.paragraphs.length - 1] ?? "");
  return {
    opening_type: openingType,
    development_type: developmentType,
    ending_type: endingType,
    uses_counterargument: countDictMatches(unit.raw, CONTRAST_WORDS) > 0,
    uses_examples: countDictMatches(unit.raw, EXAMPLE_WORDS) > 0,
    uses_numbered_points: /第一[步二点]|^[一二三四五]+[、.]/m.test(unit.raw),
  };
}

function detectOpening(firstPara: string): string {
  if (/[？?]/.test(firstPara) || countDictMatches(firstPara, QUESTION_TRIGGERS) > 0)
    return "problem_opening";
  if (countDictMatches(firstPara, CONCLUSION_TRIGGERS) > 0)
    return "conclusion_first";
  if (countDictMatches(firstPara, STORY_TRIGGERS) > 0) return "story_opening";
  if (countDictMatches(firstPara, COUNTERINTUITIVE_TRIGGERS) > 0)
    return "counterintuitive";
  return "observation";
}

function detectDevelopment(unit: TextUnit): string {
  const hasProblem = countDictMatches(unit.raw, QUESTION_TRIGGERS) > 0;
  const hasCausal = countDictMatches(unit.raw, CAUSAL_WORDS) > 0;
  const hasExample = countDictMatches(unit.raw, EXAMPLE_WORDS) > 0;
  const hasContrast = countDictMatches(unit.raw, CONTRAST_WORDS) > 0;
  if (hasProblem && hasCausal) return "problem_reason_solution";
  if (hasContrast) return "pro_con_response";
  if (hasExample) return "evidence_then_opinion";
  return "linear";
}

function detectEnding(lastPara: string): string {
  if (countDictMatches(lastPara, SUMMARY_WORDS) > 0) return "summary";
  if (/[？?]/.test(lastPara)) return "question_reflection";
  return "takeaway";
}

// ==================== 6.10 语气与情绪强度 ====================
export function extractToneEmotion(unit: TextUnit) {
  const chars = Math.max(totalChars(unit.raw), 1);
  const sCount = Math.max(unit.sentences.length, 1);
  const emotionWords = countDictMatches(unit.raw, [...POSITIVE_WORDS, ...NEGATIVE_WORDS, ...EXAGGERATION_WORDS]);
  return {
    emotion_per_1000: (emotionWords / chars) * 1000,
    humor_per_1000: (countDictMatches(unit.raw, HUMOR_WORDS) / chars) * 1000,
    infectious_per_1000: (countDictMatches(unit.raw, INFECTIOUS_WORDS) / chars) * 1000,
    strong_judgment_per_sentence: countDictMatches(unit.raw, STRONG_JUDGMENT_WORDS) / sCount,
    weak_judgment_per_sentence: countDictMatches(unit.raw, WEAK_JUDGMENT_WORDS) / sCount,
    suggestion_per_sentence: countDictMatches(unit.raw, SUGGESTION_WORDS) / sCount,
    command_per_sentence: countDictMatches(unit.raw, COMMAND_WORDS) / sCount,
    negative_per_1000: (countDictMatches(unit.raw, NEGATIVE_WORDS) / chars) * 1000,
    exaggeration_per_1000: (countDictMatches(unit.raw, EXAGGERATION_WORDS) / chars) * 1000,
  };
}

// ==================== 6.11 内容组织方式 ====================
export function extractContentOrganization(unit: TextUnit) {
  const scores = {
    case: countDictMatches(unit.raw, CASE_DRIVER_WORDS),
    data: countDictMatches(unit.raw, DATA_DRIVER_WORDS),
    concept: countDictMatches(unit.raw, CONCEPT_DRIVER_WORDS),
    problem: countDictMatches(unit.raw, PROBLEM_DRIVER_WORDS),
    method: countDictMatches(unit.raw, METHOD_DRIVER_WORDS),
  };
  const max = Math.max(...Object.values(scores));
  let mainDriver = "opinion_driven";
  if (max > 0) {
    const entry = Object.entries(scores).find(([, v]) => v === max);
    if (entry) mainDriver = `${entry[0]}_driven`;
  }
  return {
    main_driver: mainDriver,
    uses_data: scores.data > 0,
    uses_examples: scores.case > 0,
    uses_framework: scores.method > 0,
    abstractness_level: scores.concept > scores.case ? "high" : scores.case > 0 ? "medium" : "low",
  };
}

// ==================== 6.12 场景适配度 ====================
export function extractScenarioFit(unit: TextUnit, scenario: string) {
  // 仅返回原始特征，适配度计算在 scorer 中对照模板
  return {
    total_chars: totalChars(unit.raw),
    paragraph_count: unit.paragraphs.length,
    has_emoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(unit.raw),
    has_bullets: LIST_MARKER_RE.test(unit.raw),
    avg_sentence_length: unit.sentences.length > 0
      ? unit.sentences.reduce((a, s) => a + sentenceChars(s).length, 0) / unit.sentences.length
      : 0,
    scenario,
  };
}

// ==================== 汇总：一次性提取全部 12 维 ====================
export interface AllFeatures {
  text_length_structure: ReturnType<typeof extractLengthStructure>;
  sentence_rhythm: ReturnType<typeof extractSentenceRhythm>;
  paragraph_structure: ReturnType<typeof extractParagraphStructure>;
  punctuation_habits: ReturnType<typeof extractPunctuation>;
  lexical_habits: ReturnType<typeof extractLexical>;
  function_words_connectors: ReturnType<typeof extractConnectors>;
  pronoun_usage: ReturnType<typeof extractPronoun>;
  sentence_patterns: ReturnType<typeof extractSentencePatterns>;
  discourse_structure: ReturnType<typeof extractDiscourse>;
  tone_emotion: ReturnType<typeof extractToneEmotion>;
  content_organization: ReturnType<typeof extractContentOrganization>;
  scenario_fit: ReturnType<typeof extractScenarioFit>;
}

export function extractAll(text: string, scenario = "social_post"): AllFeatures {
  const unit = preprocess(text);
  return {
    text_length_structure: extractLengthStructure(unit),
    sentence_rhythm: extractSentenceRhythm(unit),
    paragraph_structure: extractParagraphStructure(unit),
    punctuation_habits: extractPunctuation(unit),
    lexical_habits: extractLexical(unit),
    function_words_connectors: extractConnectors(unit),
    pronoun_usage: extractPronoun(unit),
    sentence_patterns: extractSentencePatterns(unit),
    discourse_structure: extractDiscourse(unit),
    tone_emotion: extractToneEmotion(unit),
    content_organization: extractContentOrganization(unit),
    scenario_fit: extractScenarioFit(unit, scenario),
  };
}
