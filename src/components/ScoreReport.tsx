import { useState } from "react";
import { ChevronDown, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import type { ScoreReport } from "@/scoring/scorer";
import { RadarChart } from "@/components/RadarChart";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface ScoreReportPanelProps {
  report: ScoreReport;
  compact?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-coral";
  if (score >= 55) return "text-warning";
  return "text-error";
}

function barColor(score: number): string {
  if (score >= 85) return "bg-success";
  if (score >= 70) return "bg-coral";
  if (score >= 55) return "bg-warning";
  return "bg-error";
}

export function ScoreReportPanel({ report, compact = false }: ScoreReportPanelProps) {
  const [expanded, setExpanded] = useState(!compact);
  const { lang, t } = useI18n();
  const labelFor = (label: string) =>
    lang === "zh"
      ? label
      : ({
          文本长度与结构: "Length and structure",
          句长与节奏: "Sentence rhythm",
          段落结构: "Paragraph structure",
          标点习惯: "Punctuation",
          词汇习惯: "Vocabulary",
          功能词与连接词: "Connectors",
          人称使用: "Pronouns",
          句式模式: "Sentence patterns",
          篇章组织结构: "Discourse structure",
          语气与情绪强度: "Tone and intensity",
          内容组织方式: "Content organisation",
          场景适配度: "Scenario fit",
        }[label] ?? label);

  return (
    <div className="bg-warm-white rounded-md border border-edge/60 p-4 animate-fade-in">
      {/* 头部：综合分 + 等级 */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-tertiary">
            {t("styleMatch")}
          </span>
          {report.sampleWarning && (
            <span className="inline-flex items-center gap-1 text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">
              <AlertTriangle size={9} />
              {t("scoreSampleWarning")}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-2xl font-display font-bold", scoreColor(report.overall))}>
            {report.overall}
          </span>
          <span className="text-[12px] text-ink-tertiary">/ 100</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <span className="text-[12px] text-ink-secondary">{report.level}</span>
        <div className="flex-1 h-1 bg-edge-light rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all", barColor(report.overall))}
            style={{ width: `${report.overall}%` }}
          />
        </div>
      </div>

      {/* 展开按钮 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-[12px] text-ink-tertiary hover:text-coral transition-colors"
      >
        <ChevronDown
          size={13}
          className={cn("transition-transform", expanded && "rotate-180")}
        />
        {expanded ? t("collapseAnalysis") : t("expandAnalysis")}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* 雷达图 */}
          <div className="flex justify-center">
            <RadarChart
              labels={report.dimensions.map((d) => labelFor(d.label))}
              values={report.dimensions.map((d) => d.score)}
              size={compact ? 240 : 300}
            />
          </div>

          {/* 维度明细 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {report.dimensions.map((d) => (
              <div key={d.key} className="flex items-center gap-2">
                <span className="text-[11px] text-ink-secondary w-24 shrink-0 truncate">
                  {labelFor(d.label)}
                </span>
                <div className="flex-1 h-1.5 bg-edge-light rounded-full overflow-hidden">
                  <div
                    className={cn("h-full", barColor(d.score))}
                    style={{ width: `${d.score}%` }}
                  />
                </div>
                <span className={cn("text-[11px] font-medium w-7 text-right", scoreColor(d.score))}>
                  {Math.round(d.score)}
                </span>
              </div>
            ))}
          </div>

          {/* 匹配点 */}
          {report.matched.length > 0 && (
            <div className="space-y-1.5">
              {report.matched.map((m, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[12px] text-ink-secondary">
                  <CheckCircle2 size={13} className="text-success mt-0.5 shrink-0" />
                  {m}
                </div>
              ))}
            </div>
          )}

          {/* 偏离点 */}
          {report.mismatched.length > 0 && (
            <div className="space-y-1.5">
              {report.mismatched.map((m, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[12px] text-ink-secondary">
                  <AlertTriangle size={13} className="text-warning mt-0.5 shrink-0" />
                  {m}
                </div>
              ))}
            </div>
          )}

          {/* 建议 */}
          <div className="bg-cream rounded-md p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink mb-1">
              <Lightbulb size={13} className="text-coral" />
              {t("rewriteAdvice")}
            </div>
            {report.recommendations.map((r, i) => (
              <p key={i} className="text-[12px] text-ink-secondary leading-relaxed pl-5">
                {r}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
