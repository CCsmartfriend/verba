// 纯 SVG 雷达图，无第三方依赖，贴合珊瑚主题
interface RadarChartProps {
  // 维度标签
  labels: string[];
  // 当前数值（0-100）
  values: number[];
  // 可选参考值（0-100），如基线
  reference?: number[];
  size?: number;
}

export function RadarChart({
  labels,
  values,
  reference,
  size = 280,
}: RadarChartProps) {
  const n = labels.length;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 36;
  const rings = [0.25, 0.5, 0.75, 1];

  // 角度：从正上方开始，顺时针
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, r: number) => {
    const a = angle(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };

  // 当前数据多边形
  const dataPoints = values.map((v, i) => point(i, (Math.max(0, Math.min(100, v)) / 100) * radius));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";

  // 参考多边形（基线）
  const refPath = reference
    ? reference.map((v, i) => point(i, (Math.max(0, Math.min(100, v)) / 100) * radius))
        .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z"
    : null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="max-w-full">
      {/* 背景环 */}
      {rings.map((r, ri) => (
        <polygon
          key={ri}
          points={labels.map((_, i) => point(i, radius * r).join(",")).join(" ")}
          fill="none"
          stroke="#E8E2DC"
          strokeWidth={1}
          strokeDasharray={ri === rings.length - 1 ? "0" : "3 3"}
        />
      ))}
      {/* 轴线 */}
      {labels.map((_, i) => {
        const [x, y] = point(i, radius);
        return (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E8E2DC" strokeWidth={1} />
        );
      })}
      {/* 参考多边形 */}
      {refPath && (
        <path d={refPath} fill="rgba(191,126,94,0.08)" stroke="#BF7E5E" strokeWidth={1.2} strokeDasharray="4 3" />
      )}
      {/* 当前数据 */}
      <path d={dataPath} fill="rgba(191,126,94,0.22)" stroke="#BF7E5E" strokeWidth={2} />
      {/* 数据点 */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#BF7E5E" />
      ))}
      {/* 标签 */}
      {labels.map((label, i) => {
        const [x, y] = point(i, radius + 18);
        const a = angle(i);
        // 简单对齐：左右两侧
        const anchor = Math.abs(Math.cos(a)) < 0.3 ? "middle" : x > cx ? "start" : "end";
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-ink-secondary"
            style={{ fontSize: 10, fontWeight: 500 }}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
