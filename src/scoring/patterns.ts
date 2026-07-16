// 句式模板与场景模板（来源：技术文档 6.8 / 6.12）

// 句式模板库（正则）
export const SENTENCE_PATTERNS: Record<string, RegExp[]> = {
  not_but: [/不是.{0,20}?而是/g, /并不是.{0,20}?而是/g],
  rather_than: [/与其.{0,20}?不如/g],
  if_then: [/如果.{0,20}?那么/g, /如果.{0,20}?就/g],
  one_another: [/一方面.{0,30}?另一方面/g],
  real_question: [/真正的问题.{0,6}?是/g],
  this_means: [/这意味着/g, /也就是说/g, /换句话说/g],
};

// 场景目标特征模板
export interface ScenarioTemplate {
  id: string;
  label: string;
  maxLength?: number;
  preferredParagraphCount?: [number, number];
  allowsEmoji?: boolean;
  allowsBullets?: boolean;
  preferredSentenceLength?: "short" | "medium" | "long";
  preferredTone?: string;
  preferredOpening?: string;
}

export const SCENARIO_TEMPLATES: Record<string, ScenarioTemplate> = {
  social_post: {
    id: "social_post",
    label: "社交动态",
    preferredParagraphCount: [1, 6],
    allowsEmoji: true,
    preferredSentenceLength: "short",
    preferredTone: "personal",
  },
  long_article: {
    id: "long_article",
    label: "长文",
    preferredParagraphCount: [5, 30],
    allowsBullets: true,
    preferredSentenceLength: "medium",
    preferredTone: "analytical",
  },
  work_report: {
    id: "work_report",
    label: "工作汇报",
    preferredParagraphCount: [3, 12],
    allowsEmoji: false,
    preferredSentenceLength: "medium",
    preferredTone: "professional",
  },
  email: {
    id: "email",
    label: "邮件",
    preferredParagraphCount: [2, 10],
    allowsEmoji: false,
    preferredSentenceLength: "medium",
    preferredTone: "professional",
  },
  chat_message: {
    id: "chat_message",
    label: "聊天消息",
    preferredParagraphCount: [1, 4],
    allowsEmoji: true,
    preferredSentenceLength: "short",
    preferredTone: "casual",
  },
  xiaohongshu_post: {
    id: "xiaohongshu_post",
    label: "小红书",
    preferredParagraphCount: [4, 12],
    allowsEmoji: true,
    allowsBullets: true,
    preferredTone: "personal",
    preferredOpening: "experience_or_problem",
  },
  x_post: {
    id: "x_post",
    label: "X 帖子",
    maxLength: 280,
    preferredParagraphCount: [1, 4],
    preferredSentenceLength: "short",
    preferredTone: "sharp",
  },
  linkedin_post: {
    id: "linkedin_post",
    label: "LinkedIn",
    preferredParagraphCount: [3, 10],
    preferredSentenceLength: "medium",
    preferredTone: "professional",
  },
};

// 维度元信息：key、中文名、权重
export interface DimensionMeta {
  key: string;
  label: string;
  weight: number;
}

export const DIMENSIONS: DimensionMeta[] = [
  { key: "text_length_structure", label: "文本长度与结构", weight: 0.08 },
  { key: "sentence_rhythm", label: "句长与节奏", weight: 0.12 },
  { key: "paragraph_structure", label: "段落结构", weight: 0.08 },
  { key: "punctuation_habits", label: "标点习惯", weight: 0.08 },
  { key: "lexical_habits", label: "词汇习惯", weight: 0.12 },
  { key: "function_words_connectors", label: "功能词与连接词", weight: 0.1 },
  { key: "pronoun_usage", label: "人称使用", weight: 0.06 },
  { key: "sentence_patterns", label: "句式模式", weight: 0.08 },
  { key: "discourse_structure", label: "篇章组织结构", weight: 0.1 },
  { key: "tone_emotion", label: "语气与情绪强度", weight: 0.08 },
  { key: "content_organization", label: "内容组织方式", weight: 0.06 },
  { key: "scenario_fit", label: "场景适配度", weight: 0.04 },
];
