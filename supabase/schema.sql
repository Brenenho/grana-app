-- ============================================================
-- GRANA APP — Schema SQL
-- Cole no Supabase > SQL Editor > New query > Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  salary NUMERIC(12,2) DEFAULT 4000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('fixo','reserva','empreendedor','livre')),
  type TEXT NOT NULL CHECK (type IN ('despesa','receita')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- budget_categories
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('fixo','reserva','empreendedor','livre')),
  monthly_limit NUMERIC(12,2) NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT '📦',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- goals
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  monthly_contribution NUMERIC(12,2) DEFAULT 0,
  color TEXT DEFAULT '#22c55e',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- wishlist
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  icon TEXT DEFAULT '🛒',
  priority INTEGER DEFAULT 1,
  notes TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','comprado','descartado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- transactions
CREATE POLICY "tx_select" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tx_insert" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tx_update" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tx_delete" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- budget_categories
CREATE POLICY "budget_select" ON budget_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budget_insert" ON budget_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budget_update" ON budget_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budget_delete" ON budget_categories FOR DELETE USING (auth.uid() = user_id);

-- goals
CREATE POLICY "goals_select" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "goals_delete" ON goals FOR DELETE USING (auth.uid() = user_id);

-- wishlist
CREATE POLICY "wish_select" ON wishlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wish_insert" ON wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wish_update" ON wishlist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wish_delete" ON wishlist FOR DELETE USING (auth.uid() = user_id);

-- ── TRIGGER: cria dados iniciais ao registrar ─────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');

  INSERT INTO public.goals (user_id, name, subtitle, target_amount, current_amount, monthly_contribution, color, is_system)
  VALUES
    (NEW.id, 'Reserva de Emergência', 'Meta: 6 meses de gastos (Ramit Sethi)', 12000, 0, 400, '#22c55e', TRUE),
    (NEW.id, 'Caixa Empreendedor', 'Pague a si mesmo primeiro (Kiyosaki)', 6000, 0, 600, '#a78bfa', TRUE);

  INSERT INTO public.budget_categories (user_id, name, bucket, monthly_limit, color, icon) VALUES
    (NEW.id, 'Moradia',      'fixo',  1000, '#a78bfa', '🏠'),
    (NEW.id, 'Mercado',      'fixo',   500, '#3b82f6', '🛒'),
    (NEW.id, 'Telecom',      'fixo',   100, '#06b6d4', '📱'),
    (NEW.id, 'Assinaturas',  'fixo',   100, '#eab308', '📺'),
    (NEW.id, 'Transporte',   'fixo',   300, '#f97316', '🚗'),
    (NEW.id, 'Delivery',     'livre',  200, '#f97316', '🍔'),
    (NEW.id, 'Lazer',        'livre',  300, '#22c55e', '🎮'),
    (NEW.id, 'Roupas',       'livre',  200, '#ec4899', '👕'),
    (NEW.id, 'Saúde',        'fixo',   150, '#14b8a6', '🏥'),
    (NEW.id, 'Educação',     'livre',  200, '#8b5cf6', '📚'),
    (NEW.id, 'Outros',       'livre',  200, '#888888', '📦');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
