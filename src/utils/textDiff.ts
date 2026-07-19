export interface TextDiffSegment {
  text: string;
  operation: "unchanged" | "added" | "removed";
}

type SegmenterLike = new (
  locale?: string,
  options?: { granularity: "word" },
) => { segment: (text: string) => Iterable<{ segment: string }> };

function tokens(text: string): string[] {
  const Segmenter = (Intl as typeof Intl & { Segmenter?: SegmenterLike }).Segmenter;
  if (Segmenter) {
    return Array.from(new Segmenter(undefined, { granularity: "word" }).segment(text), (part) => part.segment);
  }
  return text.match(/\s+|[\p{L}\p{N}]+|[^\s]/gu) ?? [];
}

function merge(segments: TextDiffSegment[]): TextDiffSegment[] {
  return segments.reduce<TextDiffSegment[]>((result, segment) => {
    const previous = result[result.length - 1];
    if (previous?.operation === segment.operation) previous.text += segment.text;
    else result.push({ ...segment });
    return result;
  }, []);
}

function middleDiff(original: string, revised: string): TextDiffSegment[] {
  let start = 0;
  while (start < original.length && start < revised.length && original[start] === revised[start]) start += 1;
  let end = 0;
  while (
    end < original.length - start &&
    end < revised.length - start &&
    original[original.length - 1 - end] === revised[revised.length - 1 - end]
  ) end += 1;
  return [
    { text: revised.slice(0, start), operation: "unchanged" as const },
    { text: original.slice(start, original.length - end), operation: "removed" as const },
    { text: revised.slice(start, revised.length - end), operation: "added" as const },
    { text: end ? revised.slice(-end) : "", operation: "unchanged" as const },
  ].filter((segment) => segment.text);
}

export function diffOutput(original: string, revised: string): TextDiffSegment[] {
  if (!revised) return [];
  if (original === revised) return [{ text: revised, operation: "unchanged" }];

  const before = tokens(original);
  const after = tokens(revised);
  if (before.length * after.length > 1_500_000) return middleDiff(original, revised);

  const table = Array.from(
    { length: before.length + 1 },
    () => new Uint16Array(after.length + 1),
  );
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      table[i][j] = before[i] === after[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const result: TextDiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      result.push({ text: after[j], operation: "unchanged" });
      i += 1;
      j += 1;
    } else if (
      j < after.length &&
      (i === before.length || table[i][j + 1] > table[i + 1][j])
    ) {
      result.push({ text: after[j], operation: "added" });
      j += 1;
    } else {
      result.push({ text: before[i], operation: "removed" });
      i += 1;
    }
  }

  return merge(result);
}
