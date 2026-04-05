export function ProgressBar({
  pct,
  color,
  height = 5,
  animated = true,
}: {
  pct: number;
  color: string;
  height?: number;
  animated?: boolean;
}) {
  const clampedPct = Math.min(100, Math.max(0, pct));
  const barColor =
    pct >= 100 ? "var(--red)" : pct >= 85 ? "var(--red)" : pct >= 70 ? "var(--yellow)" : color;

  return (
    <div
      style={{
        height,
        background: "rgba(255,255,255,0.06)",
        borderRadius: height,
        overflow: "hidden",
        marginTop: 12,
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: height,
          width: `${clampedPct}%`,
          background: pct >= 100
            ? "linear-gradient(90deg, #ef4444, #f87171)"
            : pct >= 70
            ? `linear-gradient(90deg, ${barColor}, ${barColor}cc)`
            : `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
          transition: animated ? "width 0.6s cubic-bezier(0.16,1,0.3,1)" : "none",
          boxShadow: clampedPct > 0 ? `0 0 6px ${barColor}60` : "none",
        }}
      />
    </div>
  );
}
