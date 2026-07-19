import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Pencil,
  RefreshCw,
  Sparkles,
  X,
  GitCompare,
  Sliders,
} from "lucide-react";
import { useStore, adoptAndLearn } from "@/store";
import { cn } from "@/lib/utils";
import type { Fidelity } from "@/types";
import { ScoreReportPanel } from "@/components/ScoreReport";
import { useI18n } from "@/i18n";
import { dimensionLabel } from "@/utils/language";
import { diffOutput } from "@/utils/textDiff";

const FIDELITY_META: Record<Fidelity, { labelKey: string; dot: string }> = {
  high: { labelKey: "fidelityHigh", dot: "bg-success" },
  review: { labelKey: "fidelityReview", dot: "bg-warning" },
  low: { labelKey: "fidelityLow", dot: "bg-error" },
};

export function OutputPanel() {
  const { inputText, result, isGenerating, editInfo, learnSignal } = useStore();
  const runGenerate = useStore((s) => s.runGenerate);
  const commitEdit = useStore((s) => s.commitEdit);
  const cancelEdit = useStore((s) => s.cancelEdit);
  const pushToast = useStore((s) => s.pushToast);

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showChanges, setShowChanges] = useState(true);
  const [draft, setDraft] = useState("");
  const { lang, t } = useI18n();

  const hasResult = !!result && !isGenerating;
  const diff = useMemo(
    () => result?.text ? diffOutput(inputText, result.text) : [],
    [inputText, result?.text],
  );
  const hasChanges = diff.some((segment) => segment.operation !== "unchanged");

  const startEdit = () => {
    if (!result?.text) return;
    setDraft(result.text);
    setIsEditing(true);
  };

  const finishEdit = () => {
    commitEdit(draft);
    setIsEditing(false);
    const original = editInfo?.originalText ?? result?.text ?? "";
    const changed = draft.trim() !== original.trim();
    pushToast(changed ? t("editSaved") : t("noEditDetected"), changed ? "success" : "info");
  };

  const cancelEditLocal = () => {
    cancelEdit();
    setIsEditing(false);
  };

  const handleCopy = async () => {
    if (!result?.text) {
      pushToast(t("noCopyResult"), "info");
      return;
    }
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      pushToast(t("copiedToast"));
      setTimeout(() => setCopied(false), 1800);
    } catch {
      pushToast(t("copyFailed"), "error");
    }
  };

  const handleDownload = () => {
    if (!result?.text) {
      pushToast(t("noDownloadResult"), "info");
      return;
    }
    const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verba-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushToast(t("downloaded"));
  };

  const handleAdopt = () => {
    if (!result?.text) {
      pushToast(t("generateBeforeAdopt"), "info");
      return;
    }
    adoptAndLearn();
  };

  const fidelityMeta = result ? FIDELITY_META[result.fidelity] : null;
  const report = hasResult ? result.report : null;

  return (
    <div className="flex flex-col flex-1 lg:flex-[0_0_55%] lg:max-w-[55%] bg-cream relative">
      <div className="flex items-center justify-between pt-6 px-6 sm:px-7">
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-tertiary">
          {t("styleVersion")}
        </span>
        <div className="flex items-center gap-2">
          {hasResult && hasChanges && !isEditing && (
            <button
              onClick={() => setShowChanges((value) => !value)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-coral hover:text-coral-hover transition-colors"
            >
              <GitCompare size={12} />
              {t(showChanges ? "hideChanges" : "showChanges")}
            </button>
          )}
          {editInfo?.edited && !isEditing && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-coral bg-coral-light px-2 py-0.5 rounded-full">
              <GitCompare size={11} />
              {t("editedCount", { count: editInfo.changedChars })}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 sm:px-7 pt-4 flex-1 flex flex-col gap-4">
        <div className="bg-coral-light rounded-md min-h-[200px] p-5 relative flex items-start overflow-hidden">
          <Sparkles
            size={64}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-coral opacity-[0.06] pointer-events-none"
            strokeWidth={1.5}
          />

          {isGenerating ? (
            <div className="relative z-10 w-full space-y-2.5">
              <div className="h-3.5 rounded-full skeleton-shimmer bg-edge-light/60 w-[90%]" />
              <div className="h-3.5 rounded-full skeleton-shimmer bg-edge-light/60 w-[78%]" />
              <div className="h-3.5 rounded-full skeleton-shimmer bg-edge-light/60 w-[85%]" />
              <div className="h-3.5 rounded-full skeleton-shimmer bg-edge-light/60 w-[60%]" />
              <p className="text-[12px] text-ink-tertiary pt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
                {t("generating")}
              </p>
            </div>
          ) : isEditing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="relative z-10 w-full bg-coral-light/60 rounded-sm border border-coral/30 p-3 text-ink text-[15px] leading-[1.75] outline-none focus:border-coral resize-y min-h-[180px] animate-fade-in"
            />
          ) : hasResult && result.text ? (
            <p className="relative z-10 text-ink text-[15px] leading-[1.75] whitespace-pre-wrap animate-fade-in">
              {showChanges && hasChanges
                ? diff.map((segment, index) => segment.operation === "removed" ? (
                    <del
                      key={index}
                      title={t("removedText")}
                      className="bg-error-bg text-error/80 decoration-error/70 rounded-[2px]"
                    >
                      {segment.text}
                    </del>
                  ) : segment.operation === "added" ? (
                    <mark
                      key={index}
                      title={t("changedText")}
                      className="bg-coral/20 text-inherit border-b border-coral/50 rounded-[2px]"
                    >
                      {segment.text}
                    </mark>
                  ) : <span key={index}>{segment.text}</span>)
                : result.text}
            </p>
          ) : (
            <span className="relative z-10 text-ink-tertiary text-sm leading-relaxed">
              {t("resultPlaceholder")}
            </span>
          )}
        </div>

        {hasResult && hasChanges && showChanges && !isEditing && (
          <div className="flex items-center gap-4 -mt-2 text-[11px] text-ink-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded-[2px] bg-coral/20 border-b border-coral/50" />
              {t("changedText")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded-[2px] bg-error-bg border-b border-error/50" />
              {t("removedText")}
            </span>
            <span>{t("unchangedText")}</span>
          </div>
        )}

        {/* 状态检查 */}
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1.5 text-[12px] text-ink-tertiary">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                hasResult ? "bg-coral" : "bg-ink-tertiary/50",
              )}
            />
            {hasResult ? t("rulesApplied", { count: result.rulesApplied }) : t("noRulesApplied")}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-ink-tertiary">
            <Sliders size={11} className={hasResult && result.compensations > 0 ? "text-coral" : "text-ink-tertiary/50"} />
            {hasResult ? t("compensations", { count: result.compensations }) : t("noCompensations")}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-ink-tertiary">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                hasResult ? fidelityMeta?.dot : "bg-warning",
              )}
            />
            {hasResult && fidelityMeta ? t(fidelityMeta.labelKey) : t("fidelityReview")}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-ink-tertiary">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                hasResult ? "bg-coral" : "bg-ink-tertiary/50",
              )}
            />
            {hasResult ? result.platform : t("platformAuto")}
          </span>
        </div>

        {/* 评分报告 */}
        {isGenerating && (
          <div className="bg-white rounded-md border border-edge-light p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-ink-tertiary">
                {t("styleMatch")}
              </span>
              <span className="text-[12px] text-ink-tertiary">{t("scoring")}</span>
            </div>
            <div className="h-2 rounded-full bg-edge-light overflow-hidden">
              <div className="h-full w-1/2 rounded-full bg-coral/60 animate-pulse" />
            </div>
          </div>
        )}
        {report && !isEditing && (
          <ScoreReportPanel report={report} compact />
        )}

        {/* 编辑学习信号 */}
        {learnSignal && editInfo?.edited && (
          <div className="bg-coral-light/60 rounded-md p-3 animate-fade-in">
            <div className="flex items-center gap-2 text-[12px] font-medium text-ink mb-2">
              <GitCompare size={13} className="text-coral" />
              {t("editSignal")}
              <span className={cn("ml-auto font-semibold", learnSignal.delta >= 0 ? "text-success" : "text-warning")}>
                {t("matchScore")} {learnSignal.originalScore} → {learnSignal.editedScore} ({learnSignal.delta >= 0 ? "+" : ""}{learnSignal.delta})
              </span>
            </div>
            <div className="space-y-1">
              {learnSignal.improvedDims.length > 0 && (
                <p className="text-[12px] text-ink-secondary">
                  {t("improved")}{learnSignal.improvedDims.map((d) => `${dimensionLabel(d.label, lang)} (+${Math.round(d.delta)})`).join(", ")}
                </p>
              )}
              {learnSignal.regressedDims.length > 0 && (
                <p className="text-[12px] text-ink-tertiary">
                  {t("attention")}{learnSignal.regressedDims.map((d) => `${dimensionLabel(d.label, lang)} (${Math.round(d.delta)})`).join(", ")}
                </p>
              )}
              {learnSignal.improvedDims.length === 0 && learnSignal.regressedDims.length === 0 && (
                <p className="text-[12px] text-ink-tertiary">{t("smallChange")}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 px-6 sm:px-7 pt-5 pb-6 mt-2">
        {isEditing ? (
          <>
            <button
              onClick={cancelEditLocal}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary py-2 px-4 rounded-full transition-colors hover:bg-edge-light hover:text-ink"
            >
              <X size={14} />
              {t("cancel")}
            </button>
            <button
              onClick={finishEdit}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-coral py-2 px-5 rounded-full transition-all hover:bg-coral-hover hover:scale-[1.03]"
            >
              <Check size={14} />
              {t("finishEdit")}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={runGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary py-2 px-4 rounded-full transition-colors hover:bg-edge-light hover:text-ink disabled:opacity-50"
            >
              <RefreshCw size={14} className={isGenerating ? "animate-spin" : ""} />
              {t("regenerate")}
            </button>
            <button
              onClick={handleCopy}
              disabled={isGenerating || !hasResult}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary py-2 px-4 rounded-full transition-colors hover:bg-edge-light hover:text-ink disabled:opacity-50"
            >
              {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              {copied ? t("copied") : t("copy")}
            </button>
            <button
              onClick={startEdit}
              disabled={isGenerating || !hasResult}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary py-2 px-4 rounded-full transition-colors hover:bg-edge-light hover:text-ink disabled:opacity-50"
            >
              <Pencil size={14} />
              {t("edit")}
            </button>
            <button
              onClick={handleDownload}
              disabled={isGenerating || !hasResult}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary py-2 px-4 rounded-full transition-colors hover:bg-edge-light hover:text-ink disabled:opacity-50"
            >
              <Download size={14} />
              {t("download")}
            </button>
            <button
              onClick={handleAdopt}
              disabled={isGenerating || !hasResult}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-coral py-2 px-5 rounded-full transition-all hover:bg-coral-hover hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
            >
              {t("adoptLearn")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
