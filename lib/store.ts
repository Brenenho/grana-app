import { create } from "zustand";
import { Profile, Transaction, Goal, WishlistItem, BudgetCategory } from "@/types";

interface AppState {
  profile: Profile | null;
  transactions: Transaction[];
  goals: Goal[];
  wishlist: WishlistItem[];
  categories: BudgetCategory[];
  isLoaded: boolean;

  setProfile: (p: Profile) => void;
  updateProfile: (data: Partial<Profile>) => void;
  setTransactions: (t: Transaction[]) => void;
  addTransaction: (t: Transaction) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  setGoals: (g: Goal[]) => void;
  addGoal: (g: Goal) => void;
  updateGoal: (id: string, data: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setWishlist: (w: WishlistItem[]) => void;
  addWishItem: (w: WishlistItem) => void;
  deleteWishItem: (id: string) => void;
  updateWishItem: (id: string, data: Partial<WishlistItem>) => void;
  setCategories: (c: BudgetCategory[]) => void;
  addCategory: (c: BudgetCategory) => void;
  updateCategory: (id: string, data: Partial<BudgetCategory>) => void;
  deleteCategory: (id: string) => void;
  setLoaded: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  transactions: [],
  goals: [],
  wishlist: [],
  categories: [],
  isLoaded: false,

  setProfile: (profile) => set({ profile }),
  updateProfile: (data) =>
    set((s) => ({ profile: s.profile ? { ...s.profile, ...data } : s.profile })),
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (t) =>
    set((s) => ({ transactions: [t, ...s.transactions] })),
  updateTransaction: (id, data) =>
    set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...data } : t)) })),
  deleteTransaction: (id) =>
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
  setGoals: (goals) => set({ goals }),
  addGoal: (g) => set((s) => ({ goals: [...s.goals, g] })),
  updateGoal: (id, data) =>
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...data } : g)) })),
  deleteGoal: (id) =>
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
  setWishlist: (wishlist) => set({ wishlist }),
  addWishItem: (w) => set((s) => ({ wishlist: [...s.wishlist, w] })),
  deleteWishItem: (id) =>
    set((s) => ({ wishlist: s.wishlist.filter((w) => w.id !== id) })),
  updateWishItem: (id, data) =>
    set((s) => ({ wishlist: s.wishlist.map((w) => (w.id === id ? { ...w, ...data } : w)) })),
  setCategories: (categories) => set({ categories }),
  addCategory: (c) => set((s) => ({ categories: [...s.categories, c] })),
  updateCategory: (id, data) =>
    set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...data } : c)) })),
  deleteCategory: (id) =>
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
  setLoaded: () => set({ isLoaded: true }),
  reset: () =>
    set({ profile: null, transactions: [], goals: [], wishlist: [], categories: [], isLoaded: false }),
}));
