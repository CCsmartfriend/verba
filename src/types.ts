import type { Baseline } from "@/scoring/baseline";
import type { ScoreReport } from "@/scoring/scorer";

// 风格化模式（改写场景）
export type StyleMode = "mine" | "deai" | "shorten" | "wechat";

// 保真度
export type Fidelity = "high" | "review" | "low";

// 场景类型
export type ScenarioType =
  | "social_post"
  | "long_article"
  | "work_report"
  | "email"
  | "chat_message"
  | "xiaohongshu_post"
  | "x_post"
  | "linkedin_post";

// 风格档案
export interface StyleProfileMeta {
  role?: string;
  audience?: string;
  contentScene?: string;
  domain?: string;
  background?: string;
  thinkingPreference?: string;
  tonePreference?: string;
  expressionPreference?: string;
  boundaries?: string;
}

export interface StyleProfile {
  id: string;
  name: string;
  sample: string;
  // 多篇样本（每条是一篇完整文章/素材，不按段落拆分）
  samples: string[];
  // 样本存储版本。v2 表示 samples 是显式样本列表；旧数据会按整篇 sample 迁移。
  samplesVersion?: 2;
  rulesCount: number;
  createdAt: string;
  // 用户基线（由样本特征聚合）
  baseline: Baseline | null;
  // 场景
  scenario: ScenarioType;
  // 禁用词
  bannedWords: string[];
  // 用户主动填写的身份、认知和表达偏好
  profileMeta?: StyleProfileMeta;
}

// 改写结果
export interface RewriteResult {
  text: string;
  rulesApplied: number;
  fidelity: Fidelity;
  platform: string;
  // 改写使用的补偿维度数
  compensations: number;
  // 评分报告（对照用户基线）
  report: ScoreReport | null;
}

// 编辑对比信息
export interface EditInfo {
  originalText: string;
  editedText: string;
  changedChars: number;
  edited: boolean;
}

// 改写会话
export interface HistorySession {
  id: string;
  inputText: string;
  outputText: string;
  originalOutput?: string;
  edited: boolean;
  mode: StyleMode;
  profileId: string | null;
  profileName: string | null;
  rulesApplied: number;
  compensations: number;
  fidelity: Fidelity;
  // 综合风格匹配分（-1 表示无评分）
  overallScore: number;
  createdAt: string;
}

// Toast 提示
export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "info" | "error";
}
