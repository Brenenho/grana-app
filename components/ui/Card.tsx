import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}

export function Card({ children, className, style, hover = false, ...props }: CardProps) {
  return (
    <div
      className={cn(hover ? "card-hover" : "", className)}
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "20px",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        fontSize: 11,
        color: "var(--text3)",
        textTransform: "uppercase",
        letterSpacing: "0.8px",
        fontWeight: 600,
        marginBottom: 10,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Metric({
  value,
  sub,
  color,
}: {
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          fontFamily: "var(--font-dm-mono), monospace",
          letterSpacing: -0.8,
          color: color ?? "var(--text)",
          lineHeight: 1.15,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 4 }}>
          {sub}
        </div>
      )}
    </>
  );
}
