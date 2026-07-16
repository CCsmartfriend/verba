import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { ToastHost } from "@/components/Toast";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-10 pb-[60px]">
        {children}
      </main>
      <ToastHost />
    </>
  );
}
