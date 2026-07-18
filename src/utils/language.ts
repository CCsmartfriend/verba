import type { StyleProfile } from "@/types";

export type ContentLanguage = "zh" | "en";

export function detectContentLanguage(text: string): ContentLanguage {
  const letters = text.match(/[A-Za-z]/g)?.length ?? 0;
  const chinese = text.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  return chinese > letters * 0.15 ? "zh" : "en";
}

export function profileLanguage(profile: StyleProfile): ContentLanguage {
  return detectContentLanguage(
    profile.samples?.filter(Boolean).join("\n") || profile.sample || profile.name,
  );
}

export function dimensionLabel(label: string, lang: ContentLanguage): string {
  if (lang === "zh") return label;
  return ({
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
}
