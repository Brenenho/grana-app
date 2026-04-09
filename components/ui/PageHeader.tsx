export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-5 border-b border-[var(--border)]">
      <div>
        <h1 style={{
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: -0.4,
          color: "var(--text)",
          lineHeight: 1.3,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: 12.5,
            color: "var(--text3)",
            marginTop: 4,
            lineHeight: 1.5,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
