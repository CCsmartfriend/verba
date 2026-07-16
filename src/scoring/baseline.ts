// 用户基线生成：聚合多篇历史文本特征（文档 12.3）
import type { AllFeatures } from "@/scoring/extractors";

// 数值型字段提取：把 features 里所有数值字段拍平成 key->number[]
// 字符串/布尔字段单独保留众数
type NumericMap = Record<string, number[]>;
type CategoricalMap = Record<string, string[]>;

function isNum(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

function flattenNumeric(features: AllFeatures): NumericMap {
  const map: NumericMap = {};
  for (const [dim, feat] of Object.entries(features)) {
    for (const [k, v] of Object.entries(feat as Record<string, unknown>)) {
      if (isNum(v)) {
        const key = `${dim}.${k}`;
        if (!map[key]) map[key] = [];
        map[key].push(v);
      }
    }
  }
  return map;
}

function flattenCategorical(features: AllFeatures): CategoricalMap {
  const map: CategoricalMap = {};
  for (const [dim, feat] of Object.entries(features)) {
    for (const [k, v] of Object.entries(feat as Record<string, unknown>)) {
      if (typeof v === "string" || typeof v === "boolean") {
        const key = `${dim}.${k}`;
        if (!map[key]) map[key] = [];
        map[key].push(String(v));
      }
    }
  }
  return map;
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}
function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export interface Baseline {
  // 数值字段的统计
  numeric: Record<
    string,
    { mean: number; std: number; median: number; min: number; max: number }
  >;
  // 分类字段的众数分布
  categorical: Record<string, Record<string, number>>;
  sample_count: number;
  // 高频词跨样本聚合（用于 top keywords 重合度）
  top_keywords: string[];
}

// 从单篇样本生成基线（样本不足时的降级）
export function baselineFromSingle(features: AllFeatures): Baseline {
  const numericIn = flattenNumeric(features);
  const numeric: Baseline["numeric"] = {};
  for (const [k, arr] of Object.entries(numericIn)) {
    const v = arr[0] ?? 0;
    numeric[k] = { mean: v, std: 0, median: v, min: v, max: v };
  }
  const catIn = flattenCategorical(features);
  const categorical: Baseline["categorical"] = {};
  for (const [k, arr] of Object.entries(catIn)) {
    const dist: Record<string, number> = {};
    for (const v of arr) dist[v] = (dist[v] ?? 0) + 1;
    categorical[k] = dist;
  }
  const topKeywords = (features.lexical_habits.top_keywords as unknown as string[]) ?? [];
  return { numeric, categorical, sample_count: 1, top_keywords: topKeywords };
}

// 从多篇样本生成基线
export function buildBaseline(samples: AllFeatures[]): Baseline {
  if (samples.length === 0) {
    return { numeric: {}, categorical: {}, sample_count: 0, top_keywords: [] };
  }
  if (samples.length === 1) return baselineFromSingle(samples[0]);

  // 聚合所有数值
  const numericAgg: NumericMap = {};
  for (const f of samples) {
    const flat = flattenNumeric(f);
    for (const [k, arr] of Object.entries(flat)) {
      if (!numericAgg[k]) numericAgg[k] = [];
      numericAgg[k].push(...arr);
    }
  }
  const numeric: Baseline["numeric"] = {};
  for (const [k, arr] of Object.entries(numericAgg)) {
    numeric[k] = {
      mean: mean(arr),
      std: std(arr),
      median: median(arr),
      min: Math.min(...arr),
      max: Math.max(...arr),
    };
  }

  // 聚合分类
  const catAgg: CategoricalMap = {};
  for (const f of samples) {
    const flat = flattenCategorical(f);
    for (const [k, arr] of Object.entries(flat)) {
      if (!catAgg[k]) catAgg[k] = [];
      catAgg[k].push(...arr);
    }
  }
  const categorical: Baseline["categorical"] = {};
  for (const [k, arr] of Object.entries(catAgg)) {
    const dist: Record<string, number> = {};
    for (const v of arr) dist[v] = (dist[v] ?? 0) + 1;
    categorical[k] = dist;
  }

  // 高频词聚合：取所有样本 top keywords 的并集，按出现篇数排序
  const kwCount = new Map<string, number>();
  for (const f of samples) {
    const kws = (f.lexical_habits.top_keywords as unknown as string[]) ?? [];
    for (const w of kws) kwCount.set(w, (kwCount.get(w) ?? 0) + 1);
  }
  const topKeywords = [...kwCount.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))
    .slice(0, 50)
    .map(([w]) => w);

  return { numeric, categorical, sample_count: samples.length, top_keywords: topKeywords };
}
