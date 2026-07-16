// 新文本评分器（文档 6.x 各维度相似度 + 7.1 综合分 + 9 报告）
import type { AllFeatures } from "@/scoring/extractors";
import type { Baseline } from "@/scoring/baseline";
import { DIMENSIONS, SCENARIO_TEMPLATES } from "@/scoring/patterns";

// z-score → 相似度（文档 6.1）
export function zToSimilarity(z: number): number {
  if (z <= 0.5) return 100;
  if (z <= 1) return 85;
  if (z <= 1.5) return 70;
  if (z <= 2) return 55;
  return 40;
}

// 样本不足时的容忍区间相似度（文档 6.1）
export function toleranceSimilarity(newVal: number, baseMean: number): number {
  if (baseMean === 0) return newVal === 0 ? 100 : 50;
  return 100 - Math.min(100, (Math.abs(newVal - baseMean) / baseMean) * 100);
}

// 单个数值字段相似度：优先 z-score，样本不足时降级容忍区间
function numericSimilarity(
  key: string,
  newVal: number,
  baseline: Baseline,
): number {
  const b = baseline.numeric[key];
  if (!b) return 75; // 无基线，给中性分
  if (baseline.sample_count < 3 || b.std === 0) {
    return toleranceSimilarity(newVal, b.mean);
  }
  const z = Math.abs(newVal - b.mean) / b.std;
  return zToSimilarity(z);
}

// 分类字段相似度：新值是否落在用户历史众数集合里
function categoricalSimilarity(
  key: string,
  newVal: string,
  baseline: Baseline,
): number {
  const dist = baseline.categorical[key];
  if (!dist) return 75;
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  const rate = (dist[newVal] ?? 0) / total;
  if (rate >= 0.5) return 100;
  if (rate >= 0.25) return 80;
  if (rate > 0) return 60;
  return 40;
}

// 各维度评分：对维度下若干关键字段求相似度，加权平均
export interface DimensionScore {
  key: string;
  label: string;
  score: number;
  weight: number;
}

function avg(scores: number[]): number {
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 75;
}

function scoreLengthStructure(f: AllFeatures, b: Baseline): number {
  const s = f.text_length_structure;
  return avg([
    numericSimilarity("text_length_structure.total_chars", s.total_chars, b),
    numericSimilarity("text_length_structure.sentence_count", s.sentence_count, b),
    numericSimilarity("text_length_structure.paragraph_count", s.paragraph_count, b),
    numericSimilarity("text_length_structure.avg_chars_per_paragraph", s.avg_chars_per_paragraph, b),
  ]);
}

function scoreSentenceRhythm(f: AllFeatures, b: Baseline): number {
  const s = f.sentence_rhythm;
  return weighted([
    [numericSimilarity("sentence_rhythm.avg_sentence_length", s.avg_sentence_length, b), 0.25],
    [numericSimilarity("sentence_rhythm.short_sentence_ratio", s.short_sentence_ratio, b), 0.2],
    [numericSimilarity("sentence_rhythm.long_sentence_ratio", s.long_sentence_ratio, b), 0.2],
    [numericSimilarity("sentence_rhythm.sentence_length_std", s.sentence_length_std, b), 0.2],
    [numericSimilarity("sentence_rhythm.alternation_rate", s.alternation_rate, b), 0.15],
  ]);
}

function scoreParagraphStructure(f: AllFeatures, b: Baseline): number {
  const s = f.paragraph_structure;
  return avg([
    numericSimilarity("paragraph_structure.avg_paragraph_chars", s.avg_paragraph_chars, b),
    numericSimilarity("paragraph_structure.single_sentence_paragraph_ratio", s.single_sentence_paragraph_ratio, b),
    numericSimilarity("paragraph_structure.short_paragraph_ratio", s.short_paragraph_ratio, b),
    numericSimilarity("paragraph_structure.list_paragraph_ratio", s.list_paragraph_ratio, b),
  ]);
}

function scorePunctuation(f: AllFeatures, b: Baseline): number {
  const s = f.punctuation_habits;
  const keys = [
    "comma_per_1000", "period_per_1000", "question_per_1000",
    "exclamation_per_1000", "colon_per_1000", "dash_per_1000",
    "parentheses_per_1000", "emoji_per_1000",
  ] as const;
  return avg(keys.map((k) =>
    numericSimilarity(`punctuation_habits.${k}`, s[k] as number, b),
  ));
}

function scoreLexical(f: AllFeatures, b: Baseline): number {
  const s = f.lexical_habits;
  // 高频词重合度
  const newKw = new Set(s.top_keywords);
  const overlap = b.top_keywords.length
    ? b.top_keywords.filter((w) => newKw.has(w)).length / b.top_keywords.length
    : 0.5;
  const kwScore = overlap * 100;
  return weighted([
    [kwScore, 0.4],
    [numericSimilarity("lexical_habits.colloquial_per_1000", s.colloquial_per_1000, b), 0.25],
    [numericSimilarity("lexical_habits.ttr", s.ttr, b), 0.15],
    [numericSimilarity("lexical_habits.formal_per_1000", s.formal_per_1000, b), 0.1],
    // AI 腔惩罚：越低越好，反向相似度
    [aiClicheScore(s.ai_cliche_per_1000, b), 0.1],
  ]);
}

function aiClicheScore(newVal: number, b: Baseline): number {
  const base = b.numeric["lexical_habits.ai_cliche_per_1000"]?.mean ?? 0;
  // 用户基线低、新文本高 → 低分
  if (newVal <= base + 0.5) return 100;
  const excess = newVal - base;
  return Math.max(20, 100 - excess * 30);
}

function scoreConnectors(f: AllFeatures, b: Baseline): number {
  const s = f.function_words_connectors;
  const keys = [
    "contrast_per_sentence", "causal_per_sentence", "progressive_per_sentence",
    "summary_per_sentence", "example_per_sentence", "hedging_per_sentence",
  ] as const;
  return avg(keys.map((k) =>
    numericSimilarity(`function_words_connectors.${k}`, s[k] as number, b),
  ));
}

function scorePronoun(f: AllFeatures, b: Baseline): number {
  const s = f.pronoun_usage;
  return avg([
    numericSimilarity("pronoun_usage.first_person_singular_per_1000", s.first_person_singular_per_1000, b),
    numericSimilarity("pronoun_usage.first_person_plural_per_1000", s.first_person_plural_per_1000, b),
    numericSimilarity("pronoun_usage.second_person_per_1000", s.second_person_per_1000, b),
    numericSimilarity("pronoun_usage.self_experience_per_sentence", s.self_experience_per_sentence, b),
  ]);
}

function scoreSentencePatterns(f: AllFeatures, b: Baseline): number {
  const s = f.sentence_patterns;
  const keys = Object.keys(s);
  if (keys.length === 0) return 75;
  return avg(keys.map((k) =>
    numericSimilarity(`sentence_patterns.${k}`, s[k] as number, b),
  ));
}

function scoreDiscourse(f: AllFeatures, b: Baseline): number {
  const s = f.discourse_structure;
  return weighted([
    [categoricalSimilarity("discourse_structure.opening_type", s.opening_type, b), 0.25],
    [categoricalSimilarity("discourse_structure.development_type", s.development_type, b), 0.35],
    [categoricalSimilarity("discourse_structure.ending_type", s.ending_type, b), 0.2],
    [s.uses_counterargument ? 100 : 60, 0.1],
    [s.uses_examples ? 100 : 60, 0.1],
  ]);
}

function scoreToneEmotion(f: AllFeatures, b: Baseline): number {
  const s = f.tone_emotion;
  return avg([
    numericSimilarity("tone_emotion.emotion_per_1000", s.emotion_per_1000, b),
    numericSimilarity("tone_emotion.humor_per_1000", s.humor_per_1000, b),
    numericSimilarity("tone_emotion.infectious_per_1000", s.infectious_per_1000, b),
    numericSimilarity("tone_emotion.strong_judgment_per_sentence", s.strong_judgment_per_sentence, b),
    numericSimilarity("tone_emotion.weak_judgment_per_sentence", s.weak_judgment_per_sentence, b),
    numericSimilarity("tone_emotion.suggestion_per_sentence", s.suggestion_per_sentence, b),
    numericSimilarity("tone_emotion.command_per_sentence", s.command_per_sentence, b),
  ]);
}

function scoreContentOrganization(f: AllFeatures, b: Baseline): number {
  const s = f.content_organization;
  return weighted([
    [categoricalSimilarity("content_organization.main_driver", s.main_driver, b), 0.4],
    [s.uses_data ? 100 : 70, 0.15],
    [s.uses_examples ? 100 : 70, 0.15],
    [s.uses_framework ? 100 : 70, 0.15],
    [categoricalSimilarity("content_organization.abstractness_level", s.abstractness_level, b), 0.15],
  ]);
}

function scoreScenarioFit(f: AllFeatures): number {
  const s = f.scenario_fit;
  const tpl = SCENARIO_TEMPLATES[s.scenario];
  if (!tpl) return 75;
  const checks: number[] = [];
  if (tpl.maxLength) {
    checks.push(s.total_chars <= tpl.maxLength ? 100 : Math.max(20, 100 - (s.total_chars - tpl.maxLength) / 5));
  }
  if (tpl.preferredParagraphCount) {
    const [lo, hi] = tpl.preferredParagraphCount;
    const pc = s.paragraph_count;
    checks.push(pc >= lo && pc <= hi ? 100 : 60);
  }
  if (tpl.allowsEmoji === false && s.has_emoji) checks.push(40);
  if (tpl.allowsEmoji === true) checks.push(90);
  if (tpl.preferredSentenceLength === "short") {
    checks.push(s.avg_sentence_length < 20 ? 100 : 60);
  } else if (tpl.preferredSentenceLength === "medium") {
    checks.push(s.avg_sentence_length >= 15 && s.avg_sentence_length <= 35 ? 100 : 70);
  }
  return checks.length ? avg(checks) : 75;
}

function weighted(pairs: Array<[number, number]>): number {
  const total = pairs.reduce((a, [, w]) => a + w, 0) || 1;
  return pairs.reduce((a, [v, w]) => a + v * w, 0) / total;
}

// 完整评分报告
export interface ScoreReport {
  overall: number;
  level: string;
  dimensions: DimensionScore[];
  matched: string[];
  mismatched: string[];
  recommendations: string[];
  sampleWarning: boolean;
}

function levelOf(score: number): string {
  if (score >= 85) return "高度接近";
  if (score >= 70) return "较接近";
  if (score >= 55) return "部分相似";
  if (score >= 40) return "相似度较低";
  return "明显偏离";
}

export function scoreText(
  features: AllFeatures,
  baseline: Baseline,
): ScoreReport {
  const dims: DimensionScore[] = [
    { key: "text_length_structure", label: "文本长度与结构", weight: 0.08, score: scoreLengthStructure(features, baseline) },
    { key: "sentence_rhythm", label: "句长与节奏", weight: 0.12, score: scoreSentenceRhythm(features, baseline) },
    { key: "paragraph_structure", label: "段落结构", weight: 0.08, score: scoreParagraphStructure(features, baseline) },
    { key: "punctuation_habits", label: "标点习惯", weight: 0.08, score: scorePunctuation(features, baseline) },
    { key: "lexical_habits", label: "词汇习惯", weight: 0.12, score: scoreLexical(features, baseline) },
    { key: "function_words_connectors", label: "功能词与连接词", weight: 0.1, score: scoreConnectors(features, baseline) },
    { key: "pronoun_usage", label: "人称使用", weight: 0.06, score: scorePronoun(features, baseline) },
    { key: "sentence_patterns", label: "句式模式", weight: 0.08, score: scoreSentencePatterns(features, baseline) },
    { key: "discourse_structure", label: "篇章组织结构", weight: 0.1, score: scoreDiscourse(features, baseline) },
    { key: "tone_emotion", label: "语气与情绪强度", weight: 0.08, score: scoreToneEmotion(features, baseline) },
    { key: "content_organization", label: "内容组织方式", weight: 0.06, score: scoreContentOrganization(features, baseline) },
    { key: "scenario_fit", label: "场景适配度", weight: 0.04, score: scoreScenarioFit(features) },
  ];

  const overall = Math.round(
    dims.reduce((a, d) => a + d.score * d.weight, 0),
  );

  // 匹配点 / 偏离点：取最高 3 与最低 3
  const sorted = [...dims].sort((a, b) => b.score - a.score);
  const matched = sorted.slice(0, 3).filter((d) => d.score >= 70).map((d) =>
    `${d.label}接近你的历史习惯（${Math.round(d.score)}分）`,
  );
  const mismatched = sorted.slice(-3).filter((d) => d.score < 70).map((d) =>
    `${d.label}偏离你的历史习惯（${Math.round(d.score)}分）`,
  );

  // 建议：基于偏离维度生成
  const recommendations = generateRecommendations(dims, features);

  return {
    overall,
    level: levelOf(overall),
    dimensions: dims,
    matched,
    mismatched,
    recommendations,
    sampleWarning: baseline.sample_count < 3,
  };
}

function generateRecommendations(
  dims: DimensionScore[],
  f: AllFeatures,
): string[] {
  const recs: string[] = [];
  const byKey = new Map(dims.map((d) => [d.key, d]));
  const low = (k: string) => (byKey.get(k)?.score ?? 100) < 65;

  if (low("sentence_rhythm")) {
    const avgLen = f.sentence_rhythm.avg_sentence_length;
    recs.push(
      avgLen > 28
        ? "句子偏长，可适当切短，贴近你的节奏"
        : "句子偏短碎，可适度合并，恢复长短交替",
    );
  }
  if (low("punctuation_habits")) {
    recs.push("标点使用与历史习惯不一致，检查感叹号/问号频率");
  }
  if (low("lexical_habits")) {
    if (f.lexical_habits.ai_cliche_per_1000 > 3) {
      recs.push("AI 腔词语偏多，建议替换为你的常用表达");
    } else {
      recs.push("词汇习惯偏离，多用你常出现的词与口语/书面比例");
    }
  }
  if (low("function_words_connectors")) {
    recs.push("连接词使用方式不同，注意转折/因果/总结词的搭配");
  }
  if (low("pronoun_usage")) {
    recs.push("人称使用偏离，检查「我」「你」的使用频率");
  }
  if (low("tone_emotion")) {
    recs.push("语气情绪强度偏离，调节判断词与情绪词的使用");
  }
  if (low("discourse_structure")) {
    recs.push("篇章组织方式不同，参考你常用的开场与发展结构");
  }
  if (recs.length === 0) {
    recs.push("整体风格接近你的历史习惯，保持当前表达即可");
  }
  return recs.slice(0, 5);
}

// 导出维度元信息供 UI 使用
export { DIMENSIONS };
