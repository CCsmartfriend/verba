import { create } from "zustand";
import type {
  EditInfo,
  HistorySession,
  RewriteResult,
  ScenarioType,
  StyleMode,
  StyleProfile,
  StyleProfileMeta,
  ToastItem,
} from "@/types";
import { rewrite, analyzeEdit, type EditLearnSignal } from "@/utils/rewriter";
import { seedHistory, seedProfiles, uid } from "@/utils/seed";
import { extractAll } from "@/scoring/extractors";
import { buildBaseline } from "@/scoring/baseline";
import { scoreText } from "@/scoring/scorer";

const PROFILES_KEY = "sc.profiles";
const HISTORY_KEY = "sc.history";
let generationSeq = 0;

function loadProfiles(): StyleProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StyleProfile[];
      const migrated = parsed.map(normalizeProfileSamples);
      persistProfiles(migrated);
      return migrated;
    }
  } catch {
    /* ignore */
  }
  return seedProfiles.map(normalizeProfileSamples);
}

function loadHistory(): HistorySession[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw) as HistorySession[];
  } catch {
    /* ignore */
  }
  return seedHistory;
}

function persistProfiles(profiles: StyleProfile[]) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    /* ignore */
  }
}

function persistHistory(history: HistorySession[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* ignore */
  }
}

function cleanSamples(samples: string[]): string[] {
  return samples.map((s) => s.trim()).filter(Boolean);
}

function normalizeProfileSamples(profile: StyleProfile): StyleProfile {
  const samples =
    profile.samplesVersion === 2
      ? cleanSamples(profile.samples ?? [])
      : cleanSamples([profile.sample]);
  const sample = samples.join("\n\n---\n\n");
  return {
    ...profile,
    sample,
    samples,
    samplesVersion: 2,
    baseline: makeBaselineFromSamples(samples, profile.scenario),
  };
}

// 为档案生成基线
function makeBaselineFromSamples(samplesInput: string[], scenario: ScenarioType) {
  const samples = cleanSamples(samplesInput);
  const feats = samples.map((s) => extractAll(s, scenario));
  return buildBaseline(feats);
}

function sampleTextFrom(samples: string[]) {
  return cleanSamples(samples).join("\n\n---\n\n");
}

function meanOf(profile: StyleProfile, key: string): number {
  return profile.baseline?.numeric[key]?.mean ?? 0;
}

function modeOf(profile: StyleProfile, key: string): string {
  const dist = profile.baseline?.categorical[key];
  if (!dist) return "";
  return Object.entries(dist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function avoidsNotButPattern(meta?: StyleProfileMeta): boolean {
  if (!meta) return false;
  const source = Object.values(meta).filter(Boolean).join("\n");
  return (
    /(不喜欢|避免|不要|少用|禁用|不用|排斥|讨厌).{0,40}(不是.{0,8}而是|不是而是|而不是|并非.{0,8}而是|not[- ]?but)/i.test(
      source,
    ) ||
    /(不是.{0,8}而是|不是而是|而不是|并非.{0,8}而是).{0,16}(少用|不用|避免|禁用|不喜欢|讨厌)/.test(
      source,
    )
  );
}

function styleHints(profile?: StyleProfile): string {
  if (!profile?.baseline) return "";
  const meta = profile.profileMeta;
  const avoidNotBut = avoidsNotButPattern(meta);
  const hints = [
    avoidNotBut ? "hard_avoid_sentence_patterns=不是...而是" : "",
    meta?.role ? `role=${meta.role}` : "",
    meta?.audience ? `audience=${meta.audience}` : "",
    meta?.contentScene ? `content_scene=${meta.contentScene}` : "",
    meta?.domain ? `domain=${meta.domain}` : "",
    meta?.background ? `background=${meta.background}` : "",
    meta?.thinkingPreference ? `thinking_preference=${meta.thinkingPreference}` : "",
    meta?.tonePreference ? `tone_preference=${meta.tonePreference}` : "",
    meta?.expressionPreference ? `expression_preference=${meta.expressionPreference}` : "",
    meta?.boundaries ? `boundaries=${meta.boundaries}` : "",
    `avg_sentence_length=${Math.round(meanOf(profile, "sentence_rhythm.avg_sentence_length"))}`,
    `short_sentence_ratio=${Math.round(meanOf(profile, "sentence_rhythm.short_sentence_ratio") * 100)}%`,
    `avg_paragraph_chars=${Math.round(meanOf(profile, "paragraph_structure.avg_paragraph_chars"))}`,
    `single_sentence_paragraph_ratio=${Math.round(meanOf(profile, "paragraph_structure.single_sentence_paragraph_ratio") * 100)}%`,
    `colloquial_per_1000=${meanOf(profile, "lexical_habits.colloquial_per_1000").toFixed(1)}`,
    `formal_per_1000=${meanOf(profile, "lexical_habits.formal_per_1000").toFixed(1)}`,
    `first_person_singular_per_1000=${meanOf(profile, "pronoun_usage.first_person_singular_per_1000").toFixed(1)}`,
    `second_person_per_1000=${meanOf(profile, "pronoun_usage.second_person_per_1000").toFixed(1)}`,
    `emoji_per_1000=${meanOf(profile, "punctuation_habits.emoji_per_1000").toFixed(1)}`,
    `question_per_1000=${meanOf(profile, "punctuation_habits.question_per_1000").toFixed(1)}`,
    `exclamation_per_1000=${meanOf(profile, "punctuation_habits.exclamation_per_1000").toFixed(1)}`,
    `humor_per_1000=${meanOf(profile, "tone_emotion.humor_per_1000").toFixed(1)}`,
    `infectious_per_1000=${meanOf(profile, "tone_emotion.infectious_per_1000").toFixed(1)}`,
    `strong_judgment_per_sentence=${meanOf(profile, "tone_emotion.strong_judgment_per_sentence").toFixed(2)}`,
    `suggestion_per_sentence=${meanOf(profile, "tone_emotion.suggestion_per_sentence").toFixed(2)}`,
    `contrast_per_sentence=${meanOf(profile, "function_words_connectors.contrast_per_sentence").toFixed(2)}`,
    `causal_per_sentence=${meanOf(profile, "function_words_connectors.causal_per_sentence").toFixed(2)}`,
    `example_per_sentence=${meanOf(profile, "function_words_connectors.example_per_sentence").toFixed(2)}`,
    avoidNotBut
      ? "not_but_pattern=hard_avoid"
      : `not_but_pattern=${meanOf(profile, "sentence_patterns.not_but_per_sentence").toFixed(2)}`,
    `if_then_pattern=${meanOf(profile, "sentence_patterns.if_then_per_sentence").toFixed(2)}`,
    `opening=${modeOf(profile, "discourse_structure.opening_type")}`,
    `development=${modeOf(profile, "discourse_structure.development_type")}`,
    `ending=${modeOf(profile, "discourse_structure.ending_type")}`,
    `content_driver=${modeOf(profile, "content_organization.main_driver")}`,
    `sample_keywords_reference=${profile.baseline.top_keywords.slice(0, 16).join("、")}`,
  ];
  return hints.filter(Boolean).join("\n");
}

interface AppState {
  profiles: StyleProfile[];
  history: HistorySession[];
  activeProfileId: string | null;

  inputText: string;
  mode: StyleMode;
  scenario: ScenarioType;
  result: RewriteResult | null;
  isGenerating: boolean;
  generationError: string | null;
  editInfo: EditInfo | null;
  // 编辑学习信号（采用并学习时生成）
  learnSignal: EditLearnSignal | null;

  toasts: ToastItem[];

  setInputText: (t: string) => void;
  setMode: (m: StyleMode) => void;
  setScenario: (s: ScenarioType) => void;
  setActiveProfile: (id: string | null) => void;
  runGenerate: () => void;
  clearResult: () => void;
  commitEdit: (editedText: string) => void;
  cancelEdit: () => void;

  addProfile: (
    name: string,
    samples: string[],
    scenario?: ScenarioType,
    profileMeta?: StyleProfileMeta,
  ) => StyleProfile;
  updateProfile: (id: string, patch: Partial<StyleProfile>) => void;
  rebuildBaseline: (id: string) => void;
  removeProfile: (id: string) => void;

  restoreSession: (s: HistorySession) => void;
  clearHistory: () => void;

  pushToast: (message: string, type?: ToastItem["type"]) => void;
  dismissToast: (id: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  profiles: loadProfiles(),
  history: loadHistory(),
  activeProfileId: null,
  inputText: "",
  mode: "mine",
  scenario: "social_post",
  result: null,
  isGenerating: false,
  generationError: null,
  editInfo: null,
  learnSignal: null,
  toasts: [],

  setInputText: (t) => set({ inputText: t, generationError: null }),
  setMode: (m) => set({ mode: m }),
  setScenario: (s) => set({ scenario: s }),
  setActiveProfile: (id) => set({ activeProfileId: id }),
  clearResult: () => set({ result: null, generationError: null, editInfo: null, learnSignal: null }),

  runGenerate: async () => {
    const seq = ++generationSeq;
    const { inputText, mode, scenario, activeProfileId, profiles } = get();
    if (!inputText.trim()) {
      get().pushToast("先在左侧粘贴要改写的文字", "info");
      return;
    }
    set({ isGenerating: true, generationError: null, editInfo: null, learnSignal: null });
    const profile = profiles.find((p) => p.id === activeProfileId);
    // 临时把当前场景写进 profile，保证评分用对场景
    const effectiveProfile = profile
      ? { ...profile, scenario: profile.scenario ?? scenario }
      : undefined;
    const fallback = rewrite(inputText, mode, effectiveProfile);

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 60_000);
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          text: inputText,
          mode,
          scenario: effectiveProfile?.scenario ?? scenario,
          profileName: effectiveProfile?.name ?? "",
          profileSample: effectiveProfile
            ? sampleTextFrom(effectiveProfile.samples?.length ? effectiveProfile.samples : [effectiveProfile.sample])
            : "",
          styleHints: styleHints(effectiveProfile),
          bannedWords: effectiveProfile?.bannedWords ?? [],
        }),
      });
      window.clearTimeout(timeout);
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as { text?: string };
      const modelText = data.text?.trim();
      if (!modelText) throw new Error("empty model result");
      if (seq !== generationSeq) return;

      const report = effectiveProfile?.baseline
        ? scoreText(
            extractAll(modelText, effectiveProfile.scenario ?? scenario),
            effectiveProfile.baseline,
          )
        : null;

      set({
        result: {
          ...fallback,
          text: modelText,
          report,
          rulesApplied: Math.max(fallback.rulesApplied, 1),
          fidelity: "review",
        },
        isGenerating: false,
        generationError: null,
      });
    } catch (error) {
      if (seq !== generationSeq) return;
      console.error("Rewrite request failed", error);
      set({ result: null, isGenerating: false, generationError: "rewrite_failed" });
    }
  },

  commitEdit: (editedText) => {
    const { result, editInfo } = get();
    if (!result) return;
    const originalText = editInfo?.originalText ?? result.text;
    const changed =
      editedText.trim() === originalText.trim()
        ? 0
        : Math.abs(editedText.length - originalText.length) + 1;
    const next: EditInfo = {
      originalText,
      editedText: editedText.trim(),
      changedChars: changed,
      edited: changed > 0,
    };
    set({
      result: { ...result, text: editedText.trim() },
      editInfo: next,
    });
  },

  cancelEdit: () => {
    const { editInfo, result } = get();
    if (editInfo && result) {
      set({ result: { ...result, text: editInfo.originalText } });
    }
  },

  addProfile: (name, samplesInput, scenario = "social_post", profileMeta = {}) => {
    const samples = cleanSamples(samplesInput);
    const sample = sampleTextFrom(samples);
    const baseline = makeBaselineFromSamples(samples, scenario);
    const profile: StyleProfile = {
      id: uid(),
      name: name.trim() || "未命名风格",
      sample,
      samples,
      samplesVersion: 2,
      rulesCount: Math.min(3 + Math.floor(sample.length / 80) + samples.length * 2, 12),
      createdAt: new Date().toISOString(),
      baseline,
      scenario,
      bannedWords: [],
      profileMeta,
    };
    const profiles = [profile, ...get().profiles];
    persistProfiles(profiles);
    set({ profiles });
    return profile;
  },

  updateProfile: (id, patch) => {
    const profiles = get().profiles.map((p) =>
      p.id === id ? { ...p, ...patch } : p,
    );
    persistProfiles(profiles);
    set({ profiles });
  },

  rebuildBaseline: (id) => {
    const p = get().profiles.find((x) => x.id === id);
    if (!p) return;
    const samples = cleanSamples(p.samples?.length ? p.samples : [p.sample]);
    const sample = sampleTextFrom(samples);
    const baseline = makeBaselineFromSamples(samples, p.scenario);
    get().updateProfile(id, {
      baseline,
      sample,
      samples,
      samplesVersion: 2,
    });
    get().pushToast("风格基线已重新生成", "success");
  },

  removeProfile: (id) => {
    const profiles = get().profiles.filter((p) => p.id !== id);
    persistProfiles(profiles);
    set({
      profiles,
      activeProfileId:
        get().activeProfileId === id ? null : get().activeProfileId,
    });
  },

  restoreSession: (s) => {
    set({
      inputText: s.inputText,
      mode: s.mode,
      activeProfileId: s.profileId,
      result: {
        text: s.outputText,
        rulesApplied: s.rulesApplied,
        fidelity: s.fidelity,
        platform: s.profileName ?? "通用",
        compensations: s.compensations ?? 0,
        report: null,
      },
      editInfo: s.originalOutput
        ? {
            originalText: s.originalOutput,
            editedText: s.outputText,
            changedChars:
              Math.abs(s.outputText.length - s.originalOutput.length) + 1,
            edited: true,
          }
        : null,
      learnSignal: null,
    });
  },

  clearHistory: () => {
    persistHistory([]);
    set({ history: [] });
  },

  pushToast: (message, type = "success") => {
    const id = uid();
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => get().dismissToast(id), 2800);
  },
  dismissToast: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

// 把一次采用写入历史（由组件在采用并学习时调用）
export function saveSessionToHistory(session: HistorySession) {
  const state = useStore.getState();
  const history = [session, ...state.history].slice(0, 50);
  persistHistory(history);
  useStore.setState({ history });
}

// 采用并学习：生成编辑学习信号并写入历史
export function adoptAndLearn() {
  const state = useStore.getState();
  const { result, editInfo, inputText, mode, activeProfileId, profiles } = state;
  if (!result) return;

  const profile = profiles.find((p) => p.id === activeProfileId);
  const edited = editInfo?.edited ?? false;
  const originalOutput = editInfo?.originalText ?? result.text;
  const finalText = result.text;

  // 编辑学习信号
  let signal: EditLearnSignal | null = null;
  if (edited && profile) {
    signal = analyzeEdit(originalOutput, finalText, profile);
  }
  useStore.setState({ learnSignal: signal });

  const session: HistorySession = {
    id: uid(),
    inputText,
    outputText: finalText,
    originalOutput: edited ? originalOutput : undefined,
    edited,
    mode,
    profileId: profile?.id ?? null,
    profileName: profile?.name ?? null,
    rulesApplied: result.rulesApplied,
    compensations: result.compensations,
    fidelity: result.fidelity,
    overallScore: result.report?.overall ?? -1,
    createdAt: new Date().toISOString(),
  };
  saveSessionToHistory(session);

  if (profile && finalText && !profile.samples.includes(finalText)) {
    const samples = cleanSamples([...(profile.samples ?? []), finalText]);
    const nextSample = sampleTextFrom(samples);
    const updatedProfile: StyleProfile = {
      ...profile,
      sample: nextSample,
      samples,
      samplesVersion: 2,
      baseline: makeBaselineFromSamples(samples, profile.scenario),
      rulesCount: Math.min(profile.rulesCount + 1, 12),
    };
    const nextProfiles = profiles.map((p) =>
      p.id === profile.id ? updatedProfile : p,
    );
    persistProfiles(nextProfiles);
    useStore.setState({ profiles: nextProfiles });
  }

  state.pushToast(
    edited
      ? "已采用，你的修改将作为风格样本持续学习"
      : "已采用并记录到历史",
    "success",
  );
}
