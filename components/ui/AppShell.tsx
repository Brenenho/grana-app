"use client";
import TopNav from "@/components/ui/TopNav";
import { useData } from "@/hooks/useData";

export default function AppShell({ children }: { children: React.ReactNode }) {
  useData();
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <TopNav />
      <main style={{
        paddingTop: 76,
        paddingBottom: 48,
        paddingLeft: 40,
        paddingRight: 40,
        maxWidth: 1300,
        margin: "0 auto",
      }}>
        {children}
      </main>
    </div>
  );
}
