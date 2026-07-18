import { useState } from "react";
import { ChevronDown, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import type { ScoreReport } from "@/scoring/scorer";
import { RadarChart } from "@/components/RadarChart";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { dimensionLabel } from "@/utils/language";

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
  const labelFor = (label: string) => dimensionLabel(label, lang);
  const levelFor = (level: string) =>
    lang === "zh" ? level : ({
      高度接近: "Very close",
      较接近: "Close",
      部分相似: "Partly similar",
      相似度较低: "Low similarity",
      明显偏离: "Far from profile",
    }[level] ?? level);
  const feedbackFor = (feedback: string) => {
    if (lang === "zh") return feedback;
    const matched = feedback.match(/^(.+)接近你的历史习惯（(\d+)分）$/);
    if (matched) return `${dimensionLabel(matched[1], lang)} matches your profile (${matched[2]})`;
    const mismatched = feedback.match(/^(.+)偏离你的历史习惯（(\d+)分）$/);
    if (mismatched) return `${dimensionLabel(mismatched[1], lang)} differs from your profile (${mismatched[2]})`;
    return feedback;
  };
  const recommendationFor = (recommendation: string) =>
    lang === "zh" ? recommendation : ({
      "句子偏长，可适当切短，贴近你的节奏": "Some sentences are long. Split them to match your usual rhythm.",
      "句子偏短碎，可适度合并，恢复长短交替": "Some sentences feel fragmented. Combine a few to restore your usual rhythm.",
      "标点使用与历史习惯不一致，检查感叹号/问号频率": "Punctuation differs from your profile. Check question and exclamation mark frequency.",
      "AI 腔词语偏多，建议替换为你的常用表达": "The draft uses several generic AI phrases. Replace them with expressions you use more often.",
      "词汇习惯偏离，多用你常出现的词与口语/书面比例": "Vocabulary differs from your profile. Adjust the balance of conversational and formal language.",
      "连接词使用方式不同，注意转折/因果/总结词的搭配": "Connector use differs from your profile. Review contrast, cause, and summary phrases.",
      "人称使用偏离，检查「我」「你」的使用频率": "Pronoun use differs from your profile. Review the frequency of first and second person.",
      "语气情绪强度偏离，调节判断词与情绪词的使用": "Tone and emotional intensity differ from your profile.",
      "篇章组织方式不同，参考你常用的开场与发展结构": "The structure differs from your usual opening and development pattern.",
      "整体风格接近你的历史习惯，保持当前表达即可": "The draft is close to your profile. No major changes are needed.",
    }[recommendation] ?? recommendation);
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
        <span className="text-[12px] text-ink-secondary">{levelFor(report.level)}</span>
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
                  {feedbackFor(m)}
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
                  {feedbackFor(m)}
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
                {recommendationFor(r)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
