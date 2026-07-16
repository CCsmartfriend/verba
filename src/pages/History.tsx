import { useNavigate } from "react-router-dom";
import {
  History as HistoryIcon,
  RotateCcw,
  Trash2,
  ArrowLeft,
  Inbox,
  GitCompare,
  Gauge,
} from "lucide-react";
import { useStore } from "@/store";
import { modeLabel } from "@/utils/rewriter";
import { relativeTime, summarize } from "@/utils/seed";
import { cn } from "@/lib/utils";
import type { Fidelity } from "@/types";
import { useI18n } from "@/i18n";

const FIDELITY_DOT: Record<Fidelity, string> = {
  high: "bg-success",
  review: "bg-warning",
  low: "bg-error",
};

export default function History() {
  const navigate = useNavigate();
  const { history } = useStore();
  const restoreSession = useStore((s) => s.restoreSession);
  const clearHistory = useStore((s) => s.clearHistory);
  const pushToast = useStore((s) => s.pushToast);
  const { t } = useI18n();

  const handleRestore = (id: string) => {
    const session = history.find((h) => h.id === id);
    if (!session) return;
    restoreSession(session);
    pushToast(t("restored"));
    navigate("/");
  };

  const handleClear = () => {
    if (history.length === 0) return;
    clearHistory();
    pushToast(t("historyCleared"), "info");
  };

  return (
    <div className="pt-8 sm:pt-12">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight flex items-center gap-2.5">
            <HistoryIcon size={26} className="text-coral" />
            {t("historyTitle")}
          </h1>
          <p className="text-ink-secondary text-sm mt-2 max-w-[540px]">
            {t("historyDesc")}
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary py-2 px-4 rounded-full hover:bg-error-bg hover:text-error transition-colors"
          >
            <Trash2 size={14} />
            {t("clear")}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-edge py-16 px-6 text-center">
          <Inbox size={40} className="text-ink-tertiary mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-ink-secondary text-sm">{t("noHistory")}</p>
          <p className="text-ink-tertiary text-[13px] mt-1">
            {t("noHistoryDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <div
              key={h.id}
              className="group bg-white rounded-lg border border-edge p-5 transition-all hover:shadow-md hover:border-coral/30 animate-fade-in"
            >
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-medium text-coral bg-coral-light px-2.5 py-1 rounded-full">
                    {modeLabel(h.mode)}
                  </span>
                  {h.profileName && (
                    <span className="text-[12px] text-ink-secondary bg-cream px-2.5 py-1 rounded-full">
                      {h.profileName}
                    </span>
                  )}
                  {h.edited && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-coral bg-coral-light px-2.5 py-1 rounded-full">
                      <GitCompare size={11} />
                      {t("editedLearned")}
                    </span>
                  )}
                  {h.overallScore >= 0 && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-secondary bg-cream px-2.5 py-1 rounded-full">
                      <Gauge size={11} className="text-coral" />
                      {t("match")} {h.overallScore}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[12px] text-ink-tertiary">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        FIDELITY_DOT[h.fidelity],
                      )}
                    />
                    {h.rulesApplied} {t("rules")}
                    {h.compensations > 0 && ` · ${h.compensations} ${t("compensationShort")}`}
                  </span>
                </div>
                <span className="text-[12px] text-ink-tertiary">
                  {relativeTime(h.createdAt)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-cream rounded-md p-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary block mb-1.5">
                    {t("original")}
                  </span>
                  <p className="text-[13px] text-ink-secondary leading-relaxed">
                    {summarize(h.inputText, 80)}
                  </p>
                </div>
                <div className="bg-coral-light rounded-md p-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-coral block mb-1.5">
                    {h.edited ? t("editedStyleVersion") : t("styleVersion")}
                  </span>
                  <p className="text-[13px] text-ink leading-relaxed">
                    {summarize(h.outputText, 80)}
                  </p>
                  {h.edited && h.originalOutput && (
                    <p className="text-[12px] text-ink-tertiary leading-relaxed mt-2 pt-2 border-t border-coral/20">
                      <span className="text-[11px] font-semibold uppercase tracking-wider block mb-1">
                        {t("originalGenerated")}
                      </span>
                      {summarize(h.originalOutput, 60)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={() => handleRestore(h.id)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-coral py-1.5 px-3.5 rounded-full hover:bg-coral-light transition-colors"
                >
                  <RotateCcw size={13} />
                  {t("restoreWorkbench")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate("/")}
        className="mt-10 inline-flex items-center gap-1.5 text-[13px] text-ink-tertiary hover:text-coral transition-colors"
      >
        <ArrowLeft size={14} />
        {t("backWorkbench")}
      </button>
    </div>
  );
}
