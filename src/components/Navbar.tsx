import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, Plus, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

const LINKS: Array<{ to: string; labelKey: string; end: boolean }> = [
  { to: "/", labelKey: "navWorkbench", end: true },
  { to: "/profiles", labelKey: "navProfiles", end: false },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();

  return (
    <nav className="sticky top-0 z-[100] bg-warm-white border-b border-edge-light px-5 sm:px-8 lg:px-10 h-[60px] flex items-center justify-between">
      <NavLink to="/" className="flex items-center gap-2.5 shrink-0 no-underline">
        <Logo />
        <span className="font-bold text-[18px] text-ink whitespace-nowrap">
          {t("appName")}
        </span>
      </NavLink>

      {/* 桌面导航 */}
      <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
        {LINKS.map((l) => (
          <li key={l.to}>
            <NavLink
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "relative text-[15px] font-medium no-underline px-0 py-1 transition-colors",
                  isActive
                    ? "text-coral font-semibold"
                    : "text-ink-secondary hover:text-coral",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {t(l.labelKey)}
                  {isActive && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-coral" />
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          className="inline-flex items-center justify-center h-9 px-3 rounded-full border border-edge bg-white text-[12px] font-semibold text-ink-secondary hover:border-coral hover:text-coral transition-colors"
          aria-label={t("language")}
        >
          {lang === "zh" ? "EN" : "中文"}
        </button>
        <button
          onClick={() => navigate("/profiles")}
          className="hidden sm:inline-flex items-center gap-1.5 bg-coral text-white text-sm font-medium py-2 px-5 rounded-full hover:bg-coral-hover transition-colors"
        >
          <Plus size={15} strokeWidth={2.2} />
          {t("createStyle")}
        </button>

        {/* 移动端汉堡按钮 */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full text-ink hover:bg-coral-light transition-colors"
          aria-label={t("menu")}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 移动端下拉菜单 */}
      {open && (
        <div className="md:hidden absolute top-[60px] left-0 right-0 bg-warm-white border-b border-edge-light shadow-md animate-fade-in">
          <ul className="flex flex-col list-none m-0 p-2">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "block px-4 py-3 rounded-md text-[15px] no-underline transition-colors",
                      isActive
                        ? "text-coral font-semibold bg-coral-light"
                        : "text-ink-secondary hover:text-coral hover:bg-coral-light",
                    )
                  }
                >
                  {t(l.labelKey)}
                </NavLink>
              </li>
            ))}
            <li>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/profiles");
                }}
                className="w-full mt-1 inline-flex items-center justify-center gap-1.5 bg-coral text-white text-sm font-medium py-2.5 px-5 rounded-full hover:bg-coral-hover transition-colors"
              >
                <Plus size={15} strokeWidth={2.2} />
                {t("createStyle")}
              </button>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
