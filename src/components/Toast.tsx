import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

export function ToastHost() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium animate-toast-in cursor-pointer",
            t.type === "success" && "bg-ink text-white",
            t.type === "info" && "bg-warm-white text-ink border border-edge",
            t.type === "error" && "bg-error text-white",
          )}
        >
          {t.type === "success" && <CheckCircle2 size={16} className="text-success" />}
          {t.type === "info" && <Info size={16} className="text-coral" />}
          {t.type === "error" && <XCircle size={16} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
