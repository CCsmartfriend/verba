import { useRef } from "react";
import { Hero } from "@/components/Hero";
import { InputPanel } from "@/components/InputPanel";
import { OutputPanel } from "@/components/OutputPanel";

export default function Workbench() {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleStart = () => {
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Hero onStart={handleStart} />

      <section
        ref={editorRef}
        className="animate-fade-slide-up scroll-mt-20"
      >
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col lg:flex-row">
          <InputPanel />
          <div className="w-full lg:w-px bg-edge self-stretch" />
          <OutputPanel />
        </div>
      </section>
    </>
  );
}
