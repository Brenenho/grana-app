type Variant = "green" | "yellow" | "red" | "blue" | "purple" | "orange" | "cyan" | "pink" | "gray";

const COLORS: Record<Variant, { bg: string; color: string; border: string }> = {
  green:  { bg: "rgba(74,222,128,0.1)",  color: "#4ade80", border: "rgba(74,222,128,0.2)" },
  yellow: { bg: "rgba(250,204,21,0.1)",  color: "#facc15", border: "rgba(250,204,21,0.2)" },
  red:    { bg: "rgba(248,113,113,0.1)", color: "#f87171", border: "rgba(248,113,113,0.2)" },
  blue:   { bg: "rgba(96,165,250,0.1)",  color: "#60a5fa", border: "rgba(96,165,250,0.2)" },
  purple: { bg: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "rgba(167,139,250,0.2)" },
  orange: { bg: "rgba(251,146,60,0.1)",  color: "#fb923c", border: "rgba(251,146,60,0.2)" },
  cyan:   { bg: "rgba(34,211,238,0.1)",  color: "#22d3ee", border: "rgba(34,211,238,0.2)" },
  pink:   { bg: "rgba(244,114,182,0.1)", color: "#f472b6", border: "rgba(244,114,182,0.2)" },
  gray:   { bg: "rgba(100,100,130,0.08)", color: "var(--text2)", border: "rgba(100,100,130,0.12)" },
};

const BUCKET_VARIANT: Record<string, Variant> = {
  fixo: "blue",
  reserva: "green",
  empreendedor: "purple",
  livre: "orange",
};

export function Badge({
  children,
  variant = "gray",
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  const c = COLORS[variant];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 500,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      whiteSpace: "nowrap",
      letterSpacing: "0.1px",
    }}>
      {children}
    </span>
  );
}

export function BucketBadge({ bucket }: { bucket: string }) {
  const LABELS: Record<string, string> = {
    fixo: "Fixo",
    reserva: "Reserva",
    empreendedor: "Empreend.",
    livre: "Livre",
  };
  return (
    <Badge variant={BUCKET_VARIANT[bucket] ?? "gray"}>
      {LABELS[bucket] ?? bucket}
    </Badge>
  );
}
