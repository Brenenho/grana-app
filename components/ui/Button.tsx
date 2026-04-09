"use client";
import { cn } from "@/lib/utils";

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const VARIANTS = {
  primary: {
    background: "var(--accent)",
    borderColor: "transparent",
    color: "#052e16",
    boxShadow: "none",
    hoverBg: "#6ee79a",
    hoverBoxShadow: "0 0 0 3px var(--accent-glow)",
  },
  danger: {
    background: "rgba(248,113,113,0.08)",
    borderColor: "rgba(248,113,113,0.2)",
    color: "var(--red)",
    boxShadow: "none",
    hoverBg: "rgba(248,113,113,0.14)",
    hoverBoxShadow: "none",
  },
  default: {
    background: "var(--bg4)",
    borderColor: "var(--border2)",
    color: "var(--text)",
    boxShadow: "none",
    hoverBg: "var(--bg5)",
    hoverBoxShadow: "none",
  },
  ghost: {
    background: "transparent",
    borderColor: "transparent",
    color: "var(--text2)",
    boxShadow: "none",
    hoverBg: "var(--bg3)",
    hoverBoxShadow: "none",
  },
};

const SIZES = {
  sm: { padding: "5px 11px", fontSize: 12, borderRadius: 7, gap: 4 },
  md: { padding: "9px 18px", fontSize: 13.5, borderRadius: 9, gap: 6 },
  lg: { padding: "11px 24px", fontSize: 14.5, borderRadius: 10, gap: 7 },
};

export function Button({
  children,
  variant = "default",
  size = "md",
  className,
  style,
  disabled,
  type = "button",
  ...props
}: BtnProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        borderRadius: s.borderRadius,
        border: `1.5px solid ${v.borderColor}`,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        fontSize: s.fontSize,
        fontWeight: 500,
        transition: "all 0.15s ease",
        padding: s.padding,
        opacity: disabled ? 0.45 : 1,
        userSelect: "none",
        letterSpacing: "-0.1px",
        background: v.background,
        color: v.color,
        boxShadow: v.boxShadow,
        whiteSpace: "nowrap",
        ...style,
      }}
      className={cn(className)}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = v.hoverBg;
        if (v.hoverBoxShadow) e.currentTarget.style.boxShadow = v.hoverBoxShadow;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = v.background;
        e.currentTarget.style.boxShadow = v.boxShadow;
      }}
      {...props}
    >
      {children}
    </button>
  );
}
