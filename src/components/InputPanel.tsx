import { type ChangeEvent } from "react";
import { ChevronDown, Upload, User } from "lucide-react";
import { useStore } from "@/store";
import type { StyleMode } from "@/types";
import { useI18n } from "@/i18n";

const REWRITE_MODES: {
  mode: StyleMode;
  labelKey: string;
}[] = [
  { mode: "mine", labelKey: "rewriteMine" },
  { mode: "shorten", labelKey: "shorten" },
];

export function InputPanel() {
  const { inputText, mode, activeProfileId, profiles } = useStore();
  const setInputText = useStore((s) => s.setInputText);
  const setMode = useStore((s) => s.setMode);
  const setActiveProfile = useStore((s) => s.setActiveProfile);
  const runGenerate = useStore((s) => s.runGenerate);
  const pushToast = useStore((s) => s.pushToast);
  const { t } = useI18n();

  const charCount = inputText.length;

  const handleMode = (m: StyleMode) => {
    setMode(m);
    if (inputText.trim()) runGenerate();
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const chunks: string[] = [];
    for (const file of files) {
      if (file.size > 1024 * 1024 * 2) {
        pushToast(t("fileTooLarge", { name: file.name }), "error");
        continue;
      }
      try {
        chunks.push(await file.text());
      } catch {
        pushToast(t("fileReadFailed", { name: file.name }), "error");
      }
    }
    if (!chunks.length) return;
    setInputText([inputText.trim(), chunks.join("\n\n").trim()].filter(Boolean).join("\n\n"));
    pushToast(t("importedFiles", { count: chunks.length }));
  };

  return (
    <div className="flex flex-col flex-1 lg:flex-[0_0_45%] lg:max-w-[45%]">
      <div className="flex items-center justify-between pt-6 px-6 sm:px-7">
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-tertiary">
          {t("input")}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-ink-tertiary">
            {t("pasteHint")}
          </span>
          <label className="inline-flex items-center gap-1 text-[11px] font-medium text-coral hover:text-coral-hover transition-colors cursor-pointer">
            <Upload size={13} />
            {t("uploadAttachment")}
            <input
              type="file"
              multiple
              accept=".txt,.md,.markdown,.csv,.json,.html,.htm,text/plain,text/markdown,text/html,text/csv,application/json"
              onChange={handleFiles}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="px-6 sm:px-7 pt-4">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t("inputPlaceholder")}
          className="w-full min-h-[260px] sm:min-h-[280px] border-none border-b-2 border-edge-light bg-transparent font-body text-base text-ink leading-[1.7] py-4 px-0 resize-y outline-none transition-colors focus:border-coral placeholder:text-ink-tertiary"
        />
        <div className="flex justify-end pt-1.5">
          <span className="text-[12px] text-ink-tertiary">{charCount} {t("chars")}</span>
        </div>
      </div>

      {/* 风格档案选择 */}
      <div className="px-6 sm:px-7 pb-1 animate-fade-in">
        <label className="text-[12px] text-ink-tertiary mb-1.5 flex items-center gap-1.5">
          <User size={13} />
          {t("applyProfile")}
        </label>
        <div className="relative inline-block w-full sm:w-auto">
          <select
            value={activeProfileId ?? ""}
            onChange={(e) => setActiveProfile(e.target.value || null)}
            className="appearance-none w-full sm:w-auto bg-warm-white border border-edge rounded-full text-[13px] text-ink py-2 pl-4 pr-9 outline-none focus:border-coral cursor-pointer hover:border-[#D5CFC8] transition-colors"
          >
            <option value="">{t("defaultProfile")}</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.baseline?.sample_count ?? 0} {t("samples")} · {p.rulesCount} {t("dimensions")})
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap px-6 sm:px-7 pt-3 pb-6 items-center">
        {REWRITE_MODES.map((m) => (
          <button
            key={m.mode}
            onClick={() => handleMode(m.mode)}
            className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold transition-colors ${
              mode === m.mode
                ? "bg-coral text-white hover:bg-coral-hover"
                : "text-ink-secondary hover:bg-edge-light hover:text-ink"
            }`}
          >
            {t(m.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
