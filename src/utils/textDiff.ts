export interface TextDiffSegment {
  text: string;
  changed: boolean;
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
    if (previous?.changed === segment.changed) previous.text += segment.text;
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
    { text: revised.slice(0, start), changed: false },
    { text: revised.slice(start, revised.length - end), changed: true },
    { text: end ? revised.slice(-end) : "", changed: false },
  ].filter((segment) => segment.text);
}

export function diffOutput(original: string, revised: string): TextDiffSegment[] {
  if (!revised) return [];
  if (original === revised) return [{ text: revised, changed: false }];

  const before = tokens(original);
  const after = tokens(revised);
  if (before.length * after.length > 1_500_000) return middleDiff(original, revised);

  const table = Array.from(
    { length: before.length + 1 },
    () => new Uint16Array(after.length + 1),
  );
  for (let i = 1; i <= before.length; i += 1) {
    for (let j = 1; j <= after.length; j += 1) {
      table[i][j] = before[i - 1] === after[j - 1]
        ? table[i - 1][j - 1] + 1
        : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }

  const unchanged = new Set<number>();
  let i = before.length;
  let j = after.length;
  while (i > 0 && j > 0) {
    if (before[i - 1] === after[j - 1]) {
      unchanged.add(j - 1);
      i -= 1;
      j -= 1;
    } else if (table[i - 1][j] >= table[i][j - 1]) i -= 1;
    else j -= 1;
  }

  return merge(after.map((text, index) => ({ text, changed: !unchanged.has(index) })));
}
