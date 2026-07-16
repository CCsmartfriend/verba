import {
  ArrowRight,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import { useI18n } from "@/i18n";

export function Hero({ onStart }: { onStart: () => void }) {
  const navigate = useNavigate();
  const profileCount = useStore((s) => s.profiles.length);
  const hasProfiles = profileCount > 0;
  const { lang, t } = useI18n();

  const handlePrimary = () => {
    if (hasProfiles) {
      onStart();
      return;
    }
    navigate("/profiles");
  };

  return (
    <section className="min-h-[560px] flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-[6%] py-10 sm:py-12 lg:py-14 animate-fade-slide-up">
      <div className="w-full lg:flex-[0_0_42%] lg:max-w-[42%]">
        <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[1.6px] text-coral bg-coral-light border border-coral/10 rounded-full px-3 py-1.5">
          <Sparkles size={13} />
          {t("heroBadge")}
        </span>
        <h1 className="font-display text-[34px] sm:text-[42px] lg:text-[48px] font-bold leading-[1.08] text-ink tracking-tight mt-5">
          {t("heroTitle")}
        </h1>
        <p className="text-[16px] sm:text-[17px] text-ink-secondary leading-relaxed max-w-[560px] mt-5">
          {t("heroDescription")}
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-8">
          <button
            onClick={handlePrimary}
            className="inline-flex items-center gap-2 bg-coral text-white text-base font-semibold py-3.5 px-8 rounded-full transition-all duration-200 shadow-sm hover:-translate-y-0.5 hover:shadow-lg hover:bg-coral-hover group"
          >
            {hasProfiles ? t("startRewrite") : t("createProfileFirst")}
            <ArrowRight
              size={18}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>
          <button
            onClick={() => {
              if (hasProfiles) {
                navigate("/profiles");
                return;
              }
              onStart();
            }}
            className="inline-flex items-center gap-2 border border-edge bg-white text-ink-secondary text-base font-semibold py-3.5 px-6 rounded-full transition-colors hover:border-coral hover:text-coral"
          >
            {hasProfiles ? t("manageStyle") : t("tryFirst")}
          </button>
        </div>
      </div>

      <div className="w-full lg:flex-[0_0_52%] lg:max-w-[52%] animate-fade-scale-in">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-edge">
          <div className="bg-coral-light h-11 flex items-center justify-between px-4 border-b border-edge">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-coral/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-peach/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-edge" />
            </div>
            <span className="text-[12px] font-semibold text-coral">
              {t("profileApplied")}
            </span>
            <span className="text-[11px] text-ink-tertiary">{t("livePreview")}</span>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-coral">
                <Wand2 size={15} />
                {t("rewriteMine")}
              </span>
              <div className="flex items-center gap-2 text-[12px] text-ink-tertiary">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {t("styleMatch")} 87/100
              </div>
            </div>

            <div className="relative min-h-[292px] overflow-hidden">
              <div className="hero-rewrite-input absolute inset-0">
                <div className="bg-cream rounded-md border border-edge-light p-4 sm:p-5 h-full">
                  <p className="text-[12px] text-ink-tertiary mb-3">{t("input")}</p>
                  <p className="text-[19px] leading-relaxed text-ink">
                    {lang === "zh"
                      ? "深度使用 AI 后，我发现它确实能提高效率。"
                      : "After using AI seriously, I found that it does improve efficiency."}
                  </p>
                  <button className="inline-flex items-center gap-2 bg-coral text-white text-[13px] font-semibold rounded-full px-4 py-2 mt-6 shadow-sm">
                    <Wand2 size={14} />
                    {t("startRewrite")}
                  </button>
                </div>
              </div>

              <div className="hero-rewrite-output absolute inset-0">
                <div className="bg-coral-light rounded-md border border-coral/15 p-4 sm:p-5 h-full">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[12px] text-coral font-medium">
                      {t("outputStyle")}
                    </p>
                    <span className="text-[11px] text-coral bg-white/70 rounded-full px-2 py-1">
                      {t("adjustedByBaseline")}
                    </span>
                  </div>
                  <p className="text-[21px] leading-relaxed text-ink font-medium">
                    {lang === "zh"
                      ? "深度使用 AI 后，我发现它能提高效率，也让我做一些之前不敢尝试的事。"
                      : "After using AI deeply, I found that it improves my work and helps me try things I used to avoid."}
                  </p>
                  <div className="grid grid-cols-3 gap-2.5 mt-6">
                    {[
                      [t("sentenceRhythm"), "92%"],
                      [t("expressionCloseness"), "87%"],
                      [t("aiFlavor"), t("reduced")],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-md bg-white/75 border border-white px-3 py-2"
                      >
                        <p className="text-[11px] text-ink-tertiary">
                          {label}
                        </p>
                        <p className="text-[13px] font-semibold text-ink mt-0.5">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
