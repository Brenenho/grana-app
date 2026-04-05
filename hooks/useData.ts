"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { currentMonthRange } from "@/lib/utils";

export function useData() {
  const {
    isLoaded,
    setLoaded,
    setProfile,
    setTransactions,
    setGoals,
    setWishlist,
    setCategories,
  } = useAppStore();

  useEffect(() => {
    if (isLoaded) return;

    const supabase = createClient();

    async function load() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.warn("[useData] sem sessão:", authError?.message);
        return; // não marca isLoaded → vai tentar de novo
      }

      const { start, end } = currentMonthRange();

      const [profileRes, txRes, goalsRes, wishRes, catsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: false }),
        supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at"),
        supabase
          .from("wishlist")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "pendente")
          .order("priority"),
        supabase.from("budget_categories").select("*").eq("user_id", user.id),
      ]);

      // Se perfil não existe (trigger não rodou), cria agora via upsert
      if (!profileRes.data) {
        const { data: newProfile } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name ?? null,
              avatar_url: user.user_metadata?.avatar_url ?? null,
              salary: 4000,
            },
            { onConflict: "id" }
          )
          .select()
          .single();
        if (newProfile) setProfile(newProfile);
      } else {
        setProfile(profileRes.data);
      }

      if (txRes.data)   setTransactions(txRes.data);
      if (goalsRes.data) setGoals(goalsRes.data);
      if (wishRes.data)  setWishlist(wishRes.data);
      if (catsRes.data)  setCategories(catsRes.data);

      setLoaded();
    }

    load().catch((err) => console.error("[useData] erro:", err));
  }, [isLoaded, setLoaded, setProfile, setTransactions, setGoals, setWishlist, setCategories]);
}
