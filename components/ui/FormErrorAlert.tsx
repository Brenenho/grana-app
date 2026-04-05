import { AlertCircle } from "lucide-react";

export function FormErrorAlert({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div style={{
      marginBottom: 14, padding: "10px 14px", borderRadius: 10,
      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
      display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--red)",
    }}>
      <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
      {message}
    </div>
  );
}
