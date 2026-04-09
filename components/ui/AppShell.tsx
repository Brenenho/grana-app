"use client";
import TopNav from "@/components/ui/TopNav";
import { useData } from "@/hooks/useData";

export default function AppShell({ children }: { children: React.ReactNode }) {
  useData();
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <TopNav />
      <main className="px-4 md:px-10 max-w-[1300px] mx-auto pb-12">
        {children}
      </main>
    </div>
  );
}
