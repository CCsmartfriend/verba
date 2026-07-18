import type { HistorySession, StyleProfile } from "@/types";
import { extractAll } from "@/scoring/extractors";
import { buildBaseline } from "@/scoring/baseline";

// 生成稳定 id
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function splitSamples(text: string): string[] {
  return text
    .split(/\n{2,}|\n---\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function makeBaseline(sampleText: string, scenario: StyleProfile["scenario"]) {
  const samples = splitSamples(sampleText);
  const feats = samples.map((s) => extractAll(s, scenario));
  return buildBaseline(feats);
}

// 示例风格档案：每篇样本用 \n\n 分隔，便于基线聚合
const sampleTalk = `最近在折腾一个想法。你知道的，写东西这件事，最难的不是写，而是开始写。我习惯先把脑子里的乱码倒出来，再慢慢收拾。

说到时间管理，我试过很多方法。其实真正管用的没几个。大部分方法论，都是别人事后的总结，跟你的实际情况根本对不上。

我觉得写东西得放松。你越紧绷，越写不出。先随便写，烂也没关系。写完再改，比盯着空白发呆强。`;

const sampleSharp = `别再迷信方法论了。大多数方法论，都是事后总结出来的叙事。真正决定结果的，是你愿不愿意在不确定里多走两步。

很多人以为努力就够了。但其实方向错了，越努力越偏。真正的问题不是你够不够拼，是你拼的方向对不对。

与其追求完美，不如先做出来。完美是行动的敌人。你可以在过程中迭代，但你没法在空想中迭代。`;

const sampleEnglish = `I used to treat AI as a faster way to finish familiar tasks. After working with it more seriously, I noticed a wider change. It helped me attempt projects that previously felt out of reach.

That shift matters for creators. Speed is useful, but a recognisable voice still shapes whether people remember the work. Clear ideas need language that feels personal, specific, and consistent.

I prefer direct sentences and concrete examples. I keep the structure simple, explain the reasoning, and avoid inflated claims.`;

function buildSeedProfile(
  id: string,
  name: string,
  sample: string,
  scenario: StyleProfile["scenario"],
  rulesCount: number,
  createdAt: string,
): StyleProfile {
  return {
    id,
    name,
    sample,
    samples: splitSamples(sample),
    rulesCount,
    createdAt,
    baseline: makeBaseline(sample, scenario),
    scenario,
    bannedWords: [],
  };
}

// 示例风格档案
export const seedProfiles: StyleProfile[] = [
  buildSeedProfile(
    "profile-english-creator",
    "Personal Brand Voice",
    sampleEnglish,
    "linkedin_post",
    8,
    "2026-07-18T09:00:00.000Z",
  ),
  buildSeedProfile(
    "profile-talk",
    "聊天式随笔",
    sampleTalk,
    "social_post",
    7,
    "2026-06-28T09:12:00.000Z",
  ),
  buildSeedProfile(
    "profile-sharp",
    "锋利观点体",
    sampleSharp,
    "social_post",
    5,
    "2026-07-02T14:30:00.000Z",
  ),
];

// 示例历史会话
export const seedHistory: HistorySession[] = [
  {
    id: "hist-1",
    inputText:
      "综上所述，随着 AI 技术的不断发展，内容创作迎来了新的机遇。值得注意的是，创作者不仅需要掌握工具，而且需要保持自己的风格。",
    outputText:
      "AI 技术在变，内容创作的机会也在变。创作者要会用工具，更得守住自己的风格。",
    edited: false,
    mode: "deai",
    profileId: null,
    profileName: null,
    rulesApplied: 6,
    compensations: 0,
    fidelity: "high",
    overallScore: -1,
    createdAt: "2026-07-08T10:24:00.000Z",
  },
  {
    id: "hist-2",
    inputText:
      "今天读了一本关于产品思维的书，里面讲到一个观点，好的产品不是功能多，而是把一件事做到极致。",
    outputText:
      "写这篇文章的时候，我一直在想一个问题：今天读了本产品思维的书。书里说，好产品不是功能堆出来的，是把一件事做到极致。\n\n你怎么看？欢迎在评论区聊聊。",
    edited: false,
    mode: "wechat",
    profileId: null,
    profileName: null,
    rulesApplied: 4,
    compensations: 0,
    fidelity: "review",
    overallScore: -1,
    createdAt: "2026-07-09T16:48:00.000Z",
  },
  {
    id: "hist-3",
    inputText:
      "笔者认为，在当今社会，鉴于信息过载，具备筛选能力显得尤为重要。诸多方法论旨在解决这个问题，然而效果不佳。",
    outputText:
      "我考虑到信息过载，筛选能力比较重要。很多方法论想解决这个问题，但效果不好。",
    originalOutput:
      "我考虑到信息过载，筛选能力比较重要。诸多方法论想解决这个问题，但效果不佳。",
    edited: true,
    mode: "mine",
    profileId: "profile-talk",
    profileName: "聊天式随笔",
    rulesApplied: 9,
    compensations: 2,
    fidelity: "high",
    overallScore: 72,
    createdAt: "2026-07-09T20:05:00.000Z",
  },
];

// 格式化时间为相对时间
export function relativeTime(iso: string, lang: "zh" | "en" = "zh"): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return lang === "zh" ? "刚刚" : "Just now";
  if (diff < hour) return lang === "zh" ? `${Math.floor(diff / min)} 分钟前` : `${Math.floor(diff / min)} min ago`;
  if (diff < day) return lang === "zh" ? `${Math.floor(diff / hour)} 小时前` : `${Math.floor(diff / hour)} hr ago`;
  if (diff < 7 * day) return lang === "zh" ? `${Math.floor(diff / day)} 天前` : `${Math.floor(diff / day)} days ago`;
  const d = new Date(iso);
  return lang === "zh"
    ? `${d.getMonth() + 1}月${d.getDate()}日`
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// 摘要截断
export function summarize(text: string, len = 60): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > len ? t.slice(0, len) + "…" : t;
}
