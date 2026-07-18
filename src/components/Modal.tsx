import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-[480px]" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in" />
      <div
        className={`relative bg-white rounded-lg shadow-lg w-full ${maxWidth} max-h-[90vh] overflow-x-hidden overflow-y-auto animate-fade-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-edge-light">
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-ink-tertiary hover:bg-coral-light hover:text-ink transition-colors"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-w-0 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
