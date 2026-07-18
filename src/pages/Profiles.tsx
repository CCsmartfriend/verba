import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Check,
  Plus,
  Trash2,
  FileText,
  ArrowLeft,
  Settings2,
  RefreshCw,
  X,
  Upload,
  Link,
  Loader2,
  Mic,
} from "lucide-react";
import { useStore } from "@/store";
import { Modal } from "@/components/Modal";
import { relativeTime } from "@/utils/seed";
import type { ScenarioType, StyleProfile, StyleProfileMeta } from "@/types";
import { SCENARIO_TEMPLATES } from "@/scoring/patterns";
import { useI18n } from "@/i18n";

const SCENARIOS: { id: ScenarioType; label: string }[] = [
  { id: "social_post", label: "社交动态" },
  { id: "long_article", label: "长文" },
  { id: "xiaohongshu_post", label: "小红书" },
  { id: "x_post", label: "X 帖子" },
  { id: "linkedin_post", label: "LinkedIn" },
  { id: "email", label: "邮件" },
  { id: "work_report", label: "工作汇报" },
  { id: "chat_message", label: "聊天消息" },
];

const emptyMeta: StyleProfileMeta = {
  role: "",
  audience: "",
  contentScene: "",
  domain: "",
  background: "",
  thinkingPreference: "",
  tonePreference: "",
  expressionPreference: "",
  boundaries: "",
};

type BrowserSpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

// 从基线取摘要展示
function baselineSummary(p: { baseline: StyleProfileLike["baseline"] }) {
  const b = p.baseline;
  if (!b) return null;
  const avgLen = b.numeric["sentence_rhythm.avg_sentence_length"]?.mean;
  const shortRatio = b.numeric["sentence_rhythm.short_sentence_ratio"]?.mean;
  const colloq = b.numeric["lexical_habits.colloquial_per_1000"]?.mean;
  const firstPerson = b.numeric["pronoun_usage.first_person_singular_per_1000"]?.mean;
  const emoji = b.numeric["punctuation_habits.emoji_per_1000"]?.mean;
  const humor = b.numeric["tone_emotion.humor_per_1000"]?.mean;
  const infectious = b.numeric["tone_emotion.infectious_per_1000"]?.mean;
  const formal = b.numeric["lexical_habits.formal_per_1000"]?.mean;
  const contrast = b.numeric["function_words_connectors.contrast_per_sentence"]?.mean;
  const causal = b.numeric["function_words_connectors.causal_per_sentence"]?.mean;
  const example = b.numeric["function_words_connectors.example_per_sentence"]?.mean;
  const notBut = b.numeric["sentence_patterns.not_but_per_sentence"]?.mean;
  const ifThen = b.numeric["sentence_patterns.if_then_per_sentence"]?.mean;
  const opening = b.categorical["discourse_structure.opening_type"];
  const openingMode = opening ? Object.entries(opening).sort((a, c) => c[1] - a[1])[0]?.[0] : null;
  const driver = b.categorical["content_organization.main_driver"];
  const driverMode = driver ? Object.entries(driver).sort((a, c) => c[1] - a[1])[0]?.[0] : null;
  return { avgLen, shortRatio, colloq, firstPerson, emoji, humor, infectious, formal, contrast, causal, example, notBut, ifThen, openingMode, driverMode };
}

type StyleProfileLike = {
  baseline: {
    numeric: Record<string, { mean: number }>;
    categorical: Record<string, Record<string, number>>;
    sample_count: number;
    top_keywords: string[];
  } | null;
};

export default function Profiles() {
  const navigate = useNavigate();
  const { lang, t } = useI18n();
  const { profiles } = useStore();
  const addProfile = useStore((s) => s.addProfile);
  const removeProfile = useStore((s) => s.removeProfile);
  const setActiveProfile = useStore((s) => s.setActiveProfile);
  const updateProfile = useStore((s) => s.updateProfile);
  const rebuildBaseline = useStore((s) => s.rebuildBaseline);
  const pushToast = useStore((s) => s.pushToast);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sample, setSample] = useState("");
  const [sampleItems, setSampleItems] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [scenario, setScenario] = useState<ScenarioType>("social_post");
  const [profileMeta, setProfileMeta] = useState<StyleProfileMeta>(emptyMeta);
  const [isListening, setIsListening] = useState(false);
  // 设置弹层
  const [settingId, setSettingId] = useState<string | null>(null);
  const [bannedInput, setBannedInput] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSample, setEditSample] = useState("");
  const [editSamples, setEditSamples] = useState<string[]>([]);
  const [editUrl, setEditUrl] = useState("");
  const [editMeta, setEditMeta] = useState<StyleProfileMeta>(emptyMeta);
  const [isFetchingEditUrl, setIsFetchingEditUrl] = useState(false);

  const settingProfile = profiles.find((p) => p.id === settingId);
  const detailProfile = profiles.find((p) => p.id === detailId);

  const resetCreateForm = () => {
    setName("");
    setSample("");
    setSampleItems([]);
    setSourceUrl("");
    setScenario("social_post");
    setProfileMeta(emptyMeta);
    setIsFetchingUrl(false);
  };

  const closeCreate = () => {
    setOpen(false);
    resetCreateForm();
  };

  const appendSample = (text: string) => {
    const next = text.trim();
    if (!next) return;
    setSample((current) => [current.trim(), next].filter(Boolean).join("\n\n"));
  };

  const addSampleItem = (text: string) => {
    const next = text.trim();
    if (!next) return;
    setSampleItems((current) => [...current, next]);
  };

  const addEditSampleItem = (text: string) => {
    const next = text.trim();
    if (!next) return;
    setEditSamples((current) => [...current, next]);
  };

  const removeSampleItem = (index: number) => {
    setSampleItems((current) => current.filter((_, i) => i !== index));
  };

  const removeEditSampleItem = (index: number) => {
    setEditSamples((current) => current.filter((_, i) => i !== index));
  };

  const readFiles = async (files: File[]) => {
    const chunks: string[] = [];
    for (const file of files) {
      if (file.size > 1024 * 1024 * 2) {
        pushToast(`${file.name} 超过 2MB，先跳过`, "error");
        continue;
      }
      try {
        chunks.push(await file.text());
      } catch {
        pushToast(`${file.name} 读取失败`, "error");
      }
    }
    return chunks;
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const chunks = await readFiles(files);
    setSampleItems((current) => [...current, ...chunks]);
    if (chunks.length) pushToast(`已导入 ${chunks.length} 个文件`);
  };

  const updateMeta = (key: keyof StyleProfileMeta, value: string) => {
    setProfileMeta((current) => ({ ...current, [key]: value }));
  };

  const updateEditMeta = (key: keyof StyleProfileMeta, value: string) => {
    setEditMeta((current) => ({ ...current, [key]: value }));
  };

  const startVoiceInput = () => {
    const speechWindow = window as SpeechWindow;
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      pushToast("当前浏览器不支持语音输入", "error");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      pushToast("语音识别失败，请重试", "error");
    };
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join("");
      appendSample(text);
    };
    recognition.start();
  };

  const handleEditFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const chunks = await readFiles(files);
    setEditSamples((current) => [...current, ...chunks]);
    if (chunks.length) pushToast(`已追加 ${chunks.length} 个文件`);
  };

  const fetchUrl = async () => {
    if (!sourceUrl.trim()) {
      pushToast("先粘贴文章链接", "info");
      return;
    }
    setIsFetchingUrl(true);
    try {
      const response = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl.trim() }),
      });
      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok || !data.text) throw new Error(data.error || "抓取失败");
      addSampleItem(data.text);
      setSourceUrl("");
      pushToast("已抓取网页正文，作为 1 篇样本");
    } catch {
      pushToast("网页抓取失败，可以复制正文或上传文件", "error");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const fetchEditUrl = async () => {
    if (!editUrl.trim()) {
      pushToast("先粘贴文章链接", "info");
      return;
    }
    setIsFetchingEditUrl(true);
    try {
      const response = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: editUrl.trim() }),
      });
      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok || !data.text) throw new Error(data.error || "抓取失败");
      addEditSampleItem(data.text);
      setEditUrl("");
      pushToast("已追加网页正文，作为 1 篇样本");
    } catch {
      pushToast("网页抓取失败，可以复制正文或上传文件", "error");
    } finally {
      setIsFetchingEditUrl(false);
    }
  };

  const handleSubmit = () => {
    const samples = [...sampleItems, sample.trim()].filter(Boolean);
    if (!samples.length) {
      pushToast("请粘贴一段你的文章样本", "info");
      return;
    }
    const p = addProfile(name || t("unnamedStyle"), samples, scenario, profileMeta);
    closeCreate();
    pushToast(`已建立风格「${p.name}」，基线已生成`);
  };

  const handleUse = (id: string) => {
    setActiveProfile(id);
    pushToast("已选择该风格，前往工作台使用");
    navigate("/");
  };

  const openDetail = (p: StyleProfile) => {
    setDetailId(p.id);
    setEditName(p.name);
    setEditSample("");
    setEditSamples(p.samples?.length ? p.samples : [p.sample].filter(Boolean));
    setEditMeta(p.profileMeta ?? emptyMeta);
    setEditUrl("");
  };

  const saveDetail = () => {
    if (!detailProfile) return;
    const samples = [...editSamples, editSample.trim()].filter(Boolean);
    if (!samples.length) {
      pushToast("至少保留一篇样本", "error");
      return;
    }
    updateProfile(detailProfile.id, {
      name: editName.trim() || t("unnamedStyle"),
      sample: samples.join("\n\n---\n\n"),
      samples,
      samplesVersion: 2,
      profileMeta: editMeta,
    });
    rebuildBaseline(detailProfile.id);
    pushToast("风格档案已更新，基线已重建");
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeProfile(id);
    pushToast("已删除风格档案", "info");
  };

  const openSetting = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const p = profiles.find((x) => x.id === id);
    setSettingId(id);
    setBannedInput(p?.bannedWords.join("、") ?? "");
  };

  const saveSetting = () => {
    if (!settingId) return;
    const words = bannedInput
      .split(/[、,，\s]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    updateProfile(settingId, { bannedWords: words });
    setSettingId(null);
    pushToast("已保存禁用词设置");
  };

  return (
    <div className="pt-8 sm:pt-12">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight flex items-center gap-2.5">
            <BookOpen size={26} className="text-coral" />
            {t("profilesTitle")}
          </h1>
          <p className="text-ink-secondary text-sm mt-2 max-w-[560px]">
            {t("profilesDesc")}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 bg-coral text-white text-sm font-medium py-2.5 px-5 rounded-full hover:bg-coral-hover transition-colors"
        >
          <Plus size={16} strokeWidth={2.2} />
          {t("newStyle")}
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-edge py-16 px-6 text-center">
          <FileText size={40} className="text-ink-tertiary mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-ink-secondary text-sm mb-4">{t("noProfiles")}</p>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-coral text-sm font-medium hover:text-coral-hover transition-colors"
          >
            <Plus size={15} />
            {t("createFirstStyle")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((p) => {
            const summary = baselineSummary(p as unknown as { baseline: StyleProfileLike["baseline"] });
            return (
              <div
                key={p.id}
                onClick={() => openDetail(p)}
                className="group bg-white rounded-lg border border-edge p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-coral/30 animate-fade-in"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-ink leading-tight">
                      {p.name}
                    </h3>
                    <span className="text-[11px] text-ink-tertiary">
                      {(lang === "zh" ? SCENARIO_TEMPLATES[p.scenario]?.label : scenarioLabelEn(p.scenario)) ?? "Social"} · {p.baseline?.sample_count ?? 0} {t("samples")}
                    </span>
                    {(p.profileMeta?.role || p.profileMeta?.audience || p.profileMeta?.domain) && (
                      <p className="text-[11px] text-ink-tertiary mt-1">
                        {[p.profileMeta?.role, p.profileMeta?.domain, p.profileMeta?.audience]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => openSetting(p.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-7 h-7 rounded-full text-ink-tertiary hover:bg-coral-light hover:text-coral shrink-0"
                      aria-label={t("settings")}
                    >
                      <Settings2 size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rebuildBaseline(p.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-7 h-7 rounded-full text-ink-tertiary hover:bg-coral-light hover:text-coral shrink-0"
                      aria-label={t("rebuildBaseline")}
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-7 h-7 rounded-full text-ink-tertiary hover:bg-error-bg hover:text-error shrink-0"
                      aria-label={t("delete")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 基线摘要 */}
                {summary && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">平均句长</span>
                      <span className="text-ink-secondary font-medium">{Math.round(summary.avgLen ?? 0)} 字</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">短句占比</span>
                      <span className="text-ink-secondary font-medium">{Math.round((summary.shortRatio ?? 0) * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">口语词/千字</span>
                      <span className="text-ink-secondary font-medium">{(summary.colloq ?? 0).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">第一人称/千字</span>
                      <span className="text-ink-secondary font-medium">{(summary.firstPerson ?? 0).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">开场习惯</span>
                      <span className="text-ink-secondary font-medium">{openingLabel(summary.openingMode)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">内容驱动</span>
                      <span className="text-ink-secondary font-medium">{driverLabel(summary.driverMode)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">表情/千字</span>
                      <span className="text-ink-secondary font-medium">{(summary.emoji ?? 0).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">幽默感</span>
                      <span className="text-ink-secondary font-medium">{(summary.humor ?? 0).toFixed(1)}</span>
                    </div>
                  </div>
                )}

                {p.bannedWords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {p.bannedWords.slice(0, 4).map((w) => (
                      <span key={w} className="text-[10px] text-error bg-error-bg px-1.5 py-0.5 rounded-full">
                        禁用：{w}
                      </span>
                    ))}
                    {p.bannedWords.length > 4 && (
                      <span className="text-[10px] text-ink-tertiary">+{p.bannedWords.length - 4}</span>
                    )}
                  </div>
                )}

                <p className="text-[12px] text-ink-secondary leading-relaxed line-clamp-2 min-h-[36px]">
                  {p.sample}
                </p>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-edge-light">
                  <span className="text-[12px] text-coral font-medium bg-coral-light px-2.5 py-1 rounded-full">
                    {p.rulesCount} 维特征
                  </span>
                  <span className="text-[12px] text-ink-tertiary">
                    {relativeTime(p.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 新建弹层 */}
      <Modal open={open} onClose={closeCreate} title={t("newStyle")}>
        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-medium text-ink block mb-1.5">
              {t("styleName")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("styleNamePlaceholder")}
              className="w-full bg-cream border border-edge rounded-md px-3.5 py-2.5 text-sm text-ink outline-none focus:border-coral transition-colors placeholder:text-ink-tertiary"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink block mb-1.5">
              {t("scenario")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className={`text-[12px] py-1.5 px-3 rounded-full transition-colors ${
                    scenario === s.id
                      ? "bg-coral text-white"
                      : "bg-cream text-ink-secondary hover:bg-edge-light"
                  }`}
                >
                  {lang === "zh" ? s.label : scenarioLabelEn(s.id)}
                </button>
              ))}
            </div>
          </div>
          <MetaFields meta={profileMeta} onChange={updateMeta} />
          <div>
            <label className="text-[13px] font-medium text-ink block mb-1.5">
              {t("articleSamples")}
              <span className="text-ink-tertiary font-normal ml-1">
                ({t("sampleHint")})
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-2">
              <label className="inline-flex items-center justify-center gap-1.5 bg-cream border border-edge rounded-md px-3.5 py-2.5 text-[13px] font-medium text-ink-secondary hover:border-coral hover:text-coral transition-colors cursor-pointer">
                <Upload size={14} />
                {t("uploadHistory")}
                <input
                  type="file"
                  multiple
                  accept=".txt,.md,.markdown,.csv,.json,.html,.htm,text/plain,text/markdown,text/html,text/csv,application/json"
                  onChange={handleFiles}
                  className="hidden"
                />
              </label>
              <span className="self-center text-[12px] text-ink-tertiary">
                {t("supportedFiles")}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-2">
              <div className="relative">
                <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={t("urlPlaceholder")}
                  className="w-full bg-cream border border-edge rounded-md pl-9 pr-3.5 py-2.5 text-sm text-ink outline-none focus:border-coral transition-colors placeholder:text-ink-tertiary"
                />
              </div>
              <button
                onClick={fetchUrl}
                disabled={isFetchingUrl}
                className="inline-flex items-center justify-center gap-1.5 bg-cream border border-edge text-[13px] font-medium text-ink-secondary py-2.5 px-4 rounded-md hover:border-coral hover:text-coral transition-colors disabled:opacity-60"
              >
                {isFetchingUrl ? <Loader2 size={14} className="animate-spin" /> : <Link size={14} />}
                {t("fetch")}
              </button>
            </div>
            <button
              onClick={startVoiceInput}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-coral hover:text-coral-hover transition-colors mb-2"
            >
              <Mic size={14} className={isListening ? "animate-pulse" : ""} />
              {isListening ? t("listening") : t("voiceInput")}
            </button>
            <textarea
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              placeholder={t("samplePlaceholder")}
              className="w-full min-h-[160px] bg-cream border border-edge rounded-md px-3.5 py-2.5 text-sm text-ink leading-relaxed outline-none focus:border-coral transition-colors resize-y placeholder:text-ink-tertiary"
            />
            <div className="flex items-center justify-between gap-2 mt-2">
              <p className="text-[12px] text-ink-tertiary">
                {t("addedSamples", { count: sampleItems.length, chars: sample.trim().length })}
              </p>
              <button
                onClick={() => {
                  addSampleItem(sample);
                  setSample("");
                }}
                disabled={!sample.trim()}
                className="text-[12px] font-semibold text-coral bg-coral-light py-1.5 px-3 rounded-full hover:bg-coral-light/70 transition-colors disabled:opacity-40"
              >
                {t("addAsSample")}
              </button>
            </div>
            {sampleItems.length > 0 && (
              <SampleList samples={sampleItems} onRemove={removeSampleItem} />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={closeCreate}
              className="text-[13px] font-medium text-ink-secondary py-2 px-4 rounded-full hover:bg-edge-light transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSubmit}
              className="text-[13px] font-semibold text-white bg-coral py-2 px-5 rounded-full hover:bg-coral-hover transition-colors"
            >
              {t("generateBaseline")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title={`${t("styleAnalysis")} · ${detailProfile?.name ?? ""}`}
        maxWidth="max-w-[860px]"
      >
        {detailProfile && (
          <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-5">
            <div className="space-y-4">
              <div>
                <label className="text-[13px] font-medium text-ink block mb-1.5">
                  {t("styleName")}
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-cream border border-edge rounded-md px-3.5 py-2.5 text-sm text-ink outline-none focus:border-coral transition-colors"
                />
              </div>
              <MetaFields meta={editMeta} onChange={updateEditMeta} compact />

              <div className="bg-cream rounded-md border border-edge p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-semibold text-ink">{t("detailedAnalysis")}</p>
                  <span className="text-[12px] text-ink-tertiary">
                    {detailProfile.baseline?.sample_count ?? 0} {t("samples")}
                  </span>
                </div>
                {(() => {
                  const s = baselineSummary(detailProfile as unknown as { baseline: StyleProfileLike["baseline"] });
                  const rows = [
                    ["平均句长", `${Math.round(s?.avgLen ?? 0)} 字`],
                    ["短句占比", `${Math.round((s?.shortRatio ?? 0) * 100)}%`],
                    ["口语词/千字", (s?.colloq ?? 0).toFixed(1)],
                    ["第一人称/千字", (s?.firstPerson ?? 0).toFixed(1)],
                    ["表情/千字", (s?.emoji ?? 0).toFixed(1)],
                    ["幽默感/千字", (s?.humor ?? 0).toFixed(1)],
                    ["感染力/千字", (s?.infectious ?? 0).toFixed(1)],
                    ["正式词/千字", (s?.formal ?? 0).toFixed(1)],
                    ["转折/句", (s?.contrast ?? 0).toFixed(2)],
                    ["因果/句", (s?.causal ?? 0).toFixed(2)],
                    ["举例/句", (s?.example ?? 0).toFixed(2)],
                    ["不是…而是", (s?.notBut ?? 0).toFixed(2)],
                    ["如果…就", (s?.ifThen ?? 0).toFixed(2)],
                    ["开场习惯", openingLabel(s?.openingMode ?? null)],
                    ["内容驱动", driverLabel(s?.driverMode ?? null)],
                  ];
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {rows.map(([label, value]) => (
                        <div key={label} className="bg-white rounded-md border border-edge-light p-3">
                          <p className="text-[11px] text-ink-tertiary">{label}</p>
                          <p className="text-[15px] font-semibold text-ink mt-1">{value}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {detailProfile.baseline?.top_keywords.length ? (
                  <div className="mt-3 bg-white rounded-md border border-edge-light p-3">
                    <p className="text-[11px] text-ink-tertiary mb-2">高频用词</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailProfile.baseline.top_keywords.slice(0, 18).map((word) => (
                        <span key={word} className="text-[11px] text-coral bg-coral-light px-2 py-0.5 rounded-full">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleUse(detailProfile.id)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-coral py-2 px-4 rounded-full hover:bg-coral-hover transition-colors"
                >
                  <Check size={14} />
                  {t("useInWorkbench")}
                </button>
                <button
                  onClick={saveDetail}
                  className="text-[13px] font-semibold text-coral bg-coral-light py-2 px-4 rounded-full hover:bg-coral-light/70 transition-colors"
                >
                  {t("saveRebuild")}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[13px] font-medium text-ink block">
                {t("sampleMaterials")}
                <span className="text-ink-tertiary font-normal ml-1">
                  {t("sampleMaterialsHint")}
                </span>
              </label>
              <SampleList samples={editSamples} onRemove={removeEditSampleItem} />
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <label className="inline-flex items-center justify-center gap-1.5 bg-cream border border-edge rounded-md px-3.5 py-2.5 text-[13px] font-medium text-ink-secondary hover:border-coral hover:text-coral transition-colors cursor-pointer">
                  <Upload size={14} />
                  {t("addAttachment")}
                  <input
                    type="file"
                    multiple
                    accept=".txt,.md,.markdown,.csv,.json,.html,.htm,text/plain,text/markdown,text/html,text/csv,application/json"
                    onChange={handleEditFiles}
                    className="hidden"
                  />
                </label>
                <span className="self-center text-[12px] text-ink-tertiary">
                  txt / md / html / csv
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <div className="relative">
                  <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
                  <input
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder={t("appendUrlPlaceholder")}
                    className="w-full bg-cream border border-edge rounded-md pl-9 pr-3.5 py-2.5 text-sm text-ink outline-none focus:border-coral transition-colors placeholder:text-ink-tertiary"
                  />
                </div>
                <button
                  onClick={fetchEditUrl}
                  disabled={isFetchingEditUrl}
                  className="inline-flex items-center justify-center gap-1.5 bg-cream border border-edge text-[13px] font-medium text-ink-secondary py-2.5 px-4 rounded-md hover:border-coral hover:text-coral transition-colors disabled:opacity-60"
                >
                  {isFetchingEditUrl ? <Loader2 size={14} className="animate-spin" /> : <Link size={14} />}
                  {t("fetch")}
                </button>
              </div>
              <textarea
                value={editSample}
                onChange={(e) => setEditSample(e.target.value)}
                placeholder={t("appendSamplePlaceholder")}
                className="w-full min-h-[180px] bg-cream border border-edge rounded-md px-3.5 py-2.5 text-sm text-ink leading-relaxed outline-none focus:border-coral transition-colors resize-y placeholder:text-ink-tertiary"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] text-ink-tertiary">
                  {t("existingSamples", { count: editSamples.length, chars: editSample.trim().length })}
                </p>
                <button
                  onClick={() => {
                    addEditSampleItem(editSample);
                    setEditSample("");
                  }}
                  disabled={!editSample.trim()}
                  className="text-[12px] font-semibold text-coral bg-coral-light py-1.5 px-3 rounded-full hover:bg-coral-light/70 transition-colors disabled:opacity-40"
                >
                  {t("addAsSample")}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 设置弹层：禁用词 + 场景 */}
      <Modal
        open={!!settingId}
        onClose={() => setSettingId(null)}
        title={`${t("settings")} · ${settingProfile?.name ?? ""}`}
      >
        {settingProfile && (
          <div className="space-y-4">
            <div>
              <label className="text-[13px] font-medium text-ink block mb-1.5">
                {t("scenario")}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => updateProfile(settingProfile.id, { scenario: s.id })}
                    className={`text-[12px] py-1.5 px-3 rounded-full transition-colors ${
                      settingProfile.scenario === s.id
                        ? "bg-coral text-white"
                        : "bg-cream text-ink-secondary hover:bg-edge-light"
                    }`}
                  >
                    {lang === "zh" ? s.label : scenarioLabelEn(s.id)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink block mb-1.5">
                禁用词
                <span className="text-ink-tertiary font-normal ml-1">
                  （改写时自动移除这些词，用顿号分隔）
                </span>
              </label>
              <input
                value={bannedInput}
                onChange={(e) => setBannedInput(e.target.value)}
                placeholder="例如：赋能、闭环、综上所述"
                className="w-full bg-cream border border-edge rounded-md px-3.5 py-2.5 text-sm text-ink outline-none focus:border-coral transition-colors placeholder:text-ink-tertiary"
              />
              {settingProfile.bannedWords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {settingProfile.bannedWords.map((w) => (
                    <span key={w} className="inline-flex items-center gap-1 text-[11px] text-error bg-error-bg px-2 py-0.5 rounded-full">
                      {w}
                      <X
                        size={10}
                        className="cursor-pointer"
                        onClick={() =>
                          updateProfile(settingProfile.id, {
                            bannedWords: settingProfile.bannedWords.filter((x) => x !== w),
                          })
                        }
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSettingId(null)}
                className="text-[13px] font-medium text-ink-secondary py-2 px-4 rounded-full hover:bg-edge-light transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveSetting}
                className="text-[13px] font-semibold text-white bg-coral py-2 px-5 rounded-full hover:bg-coral-hover transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        )}
      </Modal>

      <button
        onClick={() => navigate("/")}
        className="mt-10 inline-flex items-center gap-1.5 text-[13px] text-ink-tertiary hover:text-coral transition-colors"
      >
        <ArrowLeft size={14} />
        返回工作台
      </button>
    </div>
  );
}

function SampleList({
  samples,
  onRemove,
}: {
  samples: string[];
  onRemove: (index: number) => void;
}) {
  const { t } = useI18n();
  if (!samples.length) {
    return (
      <div className="bg-cream border border-dashed border-edge rounded-md px-3.5 py-4 text-[12px] text-ink-tertiary">
        {t("noSamplesYet")}
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
      {samples.map((item, index) => (
        <div
          key={`${index}-${item.slice(0, 16)}`}
          className="bg-white border border-edge-light rounded-md p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-ink">
                {t("sampleCard", { index: index + 1 })}
                <span className="text-ink-tertiary font-normal ml-2">
                  {item.length} 字
                </span>
              </p>
              <p className="text-[12px] text-ink-secondary leading-relaxed line-clamp-2 mt-1">
                {item}
              </p>
            </div>
            <button
              onClick={() => onRemove(index)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-ink-tertiary hover:bg-error-bg hover:text-error transition-colors shrink-0"
              aria-label={`删除样本 ${index + 1}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetaFields({
  meta,
  onChange,
  compact = false,
}: {
  meta: StyleProfileMeta;
  onChange: (key: keyof StyleProfileMeta, value: string) => void;
  compact?: boolean;
}) {
  const { lang, t } = useI18n();
  const fields: Array<[keyof StyleProfileMeta, string, string]> = [
    ["role", "当前角色", "例如：AI 产品经理 / 设计师 / 老师"],
    ["audience", "目标受众", "例如：创业者、学生、管理层"],
    ["contentScene", "内容场景", "例如：公众号、工作汇报、课程"],
    ["domain", "专业领域", "例如：AI、教育、商业、心理学"],
    ["background", "认知背景", "例如：理科生、文科生、商科背景"],
    ["thinkingPreference", "认知偏好", "例如：偏逻辑分析 / 故事表达 / 数据论证"],
    ["tonePreference", "语气偏好", "例如：克制、犀利、温暖、幽默、专业"],
    ["expressionPreference", "表达偏好", "例如：爱举例、反问、类比、分点"],
    ["boundaries", "个性与边界", "例如：不喜欢鸡汤、夸张、营销腔"],
  ];

  return (
    <div>
      <label className="text-[13px] font-medium text-ink block mb-1.5">
        {t("userMeta")}
        <span className="text-ink-tertiary font-normal ml-1">
          ({t("userMetaHint")})
        </span>
      </label>
      <div className={`grid grid-cols-1 ${compact ? "" : "sm:grid-cols-2"} gap-2`}>
        {fields.map(([key, label, placeholder]) => (
          <input
            key={key}
            value={meta[key] ?? ""}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={lang === "zh" ? `${label}：${placeholder}` : metaPlaceholderEn(key)}
            className="w-full bg-cream border border-edge rounded-md px-3 py-2 text-[13px] text-ink outline-none focus:border-coral transition-colors placeholder:text-ink-tertiary"
          />
        ))}
      </div>
    </div>
  );
}

function openingLabel(s: string | null): string {
  const map: Record<string, string> = {
    problem_opening: "提问式",
    conclusion_first: "结论先行",
    story_opening: "故事式",
    counterintuitive: "反常识",
    observation: "观察式",
  };
  return s ? (map[s] ?? s) : "—";
}

function driverLabel(s: string | null): string {
  const map: Record<string, string> = {
    case_driven: "案例驱动",
    data_driven: "数据驱动",
    concept_driven: "概念驱动",
    problem_driven: "问题驱动",
    method_driven: "方法论",
    opinion_driven: "观点驱动",
  };
  return s ? (map[s] ?? s) : "—";
}

function scenarioLabelEn(s: ScenarioType): string {
  const map: Record<ScenarioType, string> = {
    social_post: "Social post",
    long_article: "Long article",
    xiaohongshu_post: "Xiaohongshu",
    x_post: "X post",
    linkedin_post: "LinkedIn",
    email: "Email",
    work_report: "Work report",
    chat_message: "Chat message",
  };
  return map[s];
}

function metaPlaceholderEn(key: keyof StyleProfileMeta): string {
  const map: Record<keyof StyleProfileMeta, string> = {
    role: "Current role: AI product manager, designer, teacher",
    audience: "Audience: founders, students, managers",
    contentScene: "Content scene: newsletter, report, course",
    domain: "Domain: AI, education, business, psychology",
    background: "Background: STEM, humanities, business",
    thinkingPreference: "Thinking preference: logic, stories, data",
    tonePreference: "Tone: restrained, sharp, warm, humorous, professional",
    expressionPreference: "Expression habits: examples, questions, analogies, bullets",
    boundaries: "Boundaries: avoid hype, sales tone, formulaic contrasts",
  };
  return map[key];
}
