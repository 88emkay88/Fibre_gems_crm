CREATE TYPE public.app_role AS ENUM ('admin', 'team_leader', 'agent');
CREATE TYPE public.customer_status AS ENUM ('new_lead', 'contacted', 'qualified', 'order_submitted', 'payment_pending', 'activation_pending', 'activated', 'lost');

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  agent_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'agent',
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_team_leader_for(_user_id UUID, _member_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles leader
    JOIN public.profiles member ON member.team_id = leader.team_id
    WHERE leader.id = _user_id AND member.id = _member_id
      AND public.has_role(_user_id, 'team_leader')
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_team_leader_for(UUID, UUID) TO authenticated;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Leaders can read team profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_team_leader_for(auth.uid(), id));
CREATE POLICY "Authenticated can read teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage teams" ON public.teams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_customer_id TEXT UNIQUE,
  record_status TEXT NOT NULL DEFAULT 'active' CHECK (record_status IN ('active', 'archived')),
  first_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (trim(first_name || ' ' || surname)) STORED,
  cell_number TEXT NOT NULL,
  normalized_cell TEXT NOT NULL UNIQUE,
  alternate_cell_number TEXT,
  email TEXT,
  full_address TEXT,
  area_suburb TEXT,
  product_package TEXT,
  payment_type TEXT,
  owner_id UUID NOT NULL,
  original_agent_id UUID NOT NULL,
  team_leader_id UUID,
  status public.customer_status NOT NULL DEFAULT 'new_lead',
  next_action TEXT,
  next_action_date DATE,
  last_contact_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX customers_owner_idx ON public.customers(owner_id);
CREATE INDEX customers_status_idx ON public.customers(status);
CREATE INDEX customers_next_action_idx ON public.customers(next_action_date);

CREATE OR REPLACE FUNCTION public.can_access_customer(_user_id UUID, _owner_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id = _owner_id OR public.has_role(_user_id, 'admin') OR public.is_team_leader_for(_user_id, _owner_id)
$$;
GRANT EXECUTE ON FUNCTION public.can_access_customer(UUID, UUID) TO authenticated;
CREATE POLICY "Scoped customer reads" ON public.customers FOR SELECT TO authenticated USING (public.can_access_customer(auth.uid(), owner_id));
CREATE POLICY "Agents create owned customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND owner_id = auth.uid() AND original_agent_id = auth.uid());
CREATE POLICY "Scoped customer updates" ON public.customers FOR UPDATE TO authenticated USING (public.can_access_customer(auth.uid(), owner_id)) WITH CHECK (public.can_access_customer(auth.uid(), owner_id));
CREATE POLICY "Admins archive customers" ON public.customers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  external_order_id TEXT UNIQUE,
  order_date DATE,
  ovr_number TEXT UNIQUE,
  ovk_number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  next_action TEXT,
  action_date DATE,
  source TEXT NOT NULL DEFAULT 'crm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX orders_customer_idx ON public.orders(customer_id);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  promised_payment_date DATE,
  payment_date DATE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX payments_customer_idx ON public.payments(customer_id);

CREATE TABLE public.activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  activation_date DATE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activations TO authenticated;
GRANT ALL ON public.activations TO service_role;
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;
CREATE INDEX activations_customer_idx ON public.activations(customer_id);

CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  contact_method TEXT,
  outcome TEXT,
  customer_status_after public.customer_status,
  next_action TEXT,
  next_action_date DATE,
  escalation_type TEXT,
  escalation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX activities_customer_created_idx ON public.activities(customer_id, created_at DESC);

CREATE TABLE public.daily_agent_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  touch_count INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, activity_date)
);
GRANT SELECT, INSERT, UPDATE ON public.daily_agent_activity TO authenticated;
GRANT ALL ON public.daily_agent_activity TO service_role;
ALTER TABLE public.daily_agent_activity ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product TEXT NOT NULL UNIQUE,
  crm_product TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_mappings TO authenticated;
GRANT ALL ON public.product_mappings TO service_role;
ALTER TABLE public.product_mappings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.agility_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'validated', 'committed', 'failed')),
  row_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agility_import_batches TO authenticated;
GRANT ALL ON public.agility_import_batches TO service_role;
ALTER TABLE public.agility_import_batches ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.agility_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.agility_import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  ovr_number TEXT,
  ovk_number TEXT,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  UNIQUE(batch_id, row_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agility_import_rows TO authenticated;
GRANT ALL ON public.agility_import_rows TO service_role;
ALTER TABLE public.agility_import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scoped order access" ON public.orders FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.can_access_customer(auth.uid(), c.owner_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.can_access_customer(auth.uid(), c.owner_id)));
CREATE POLICY "Scoped payment access" ON public.payments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.can_access_customer(auth.uid(), c.owner_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.can_access_customer(auth.uid(), c.owner_id)));
CREATE POLICY "Scoped activation access" ON public.activations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.can_access_customer(auth.uid(), c.owner_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.can_access_customer(auth.uid(), c.owner_id)));
CREATE POLICY "Scoped activity reads" ON public.activities FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.can_access_customer(auth.uid(), c.owner_id)));
CREATE POLICY "Scoped activity inserts" ON public.activities FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.can_access_customer(auth.uid(), c.owner_id)));
CREATE POLICY "Scoped daily activity reads" ON public.daily_agent_activity FOR SELECT TO authenticated USING (agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_team_leader_for(auth.uid(), agent_id));
CREATE POLICY "Agents maintain own activity" ON public.daily_agent_activity FOR INSERT TO authenticated WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Agents update own activity" ON public.daily_agent_activity FOR UPDATE TO authenticated USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Authenticated read mappings" ON public.product_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage mappings" ON public.product_mappings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage import batches" ON public.agility_import_batches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin') AND uploaded_by = auth.uid());
CREATE POLICY "Admins manage import rows" ON public.agility_import_rows FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.bootstrap_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)), COALESCE(NEW.email, ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agent');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.bootstrap_profile();