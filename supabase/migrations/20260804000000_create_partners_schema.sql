-- Crear tabla de Socios (Partners)
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  profit_percentage numeric(5, 2) NOT NULL DEFAULT 10.00 CHECK (profit_percentage >= 0),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Crear tabla de Transacciones de Socios
CREATE TABLE IF NOT EXISTS partner_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('inversion', 'retiro')),
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  transaction_date timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Políticas de Seguridad (RLS) para partners
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver sus propios socios"
ON partners FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propios socios"
ON partners FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios socios"
ON partners FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios socios"
ON partners FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Políticas de Seguridad (RLS) para partner_transactions
ALTER TABLE partner_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver las transacciones de sus socios"
ON partner_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar transacciones de sus socios"
ON partner_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar transacciones de sus socios"
ON partner_transactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
