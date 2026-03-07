
-- billing_customers: vincula pagador Stripe ao auth user
CREATE TABLE public.billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  stripe_customer_id text NOT NULL UNIQUE,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- subscriptions: status da assinatura
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_customer_id uuid NOT NULL REFERENCES public.billing_customers(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_price_id text,
  status text NOT NULL DEFAULT 'incomplete',
  access_granted boolean NOT NULL DEFAULT false,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- checkout_sessions: rastreamento de sessões de checkout
CREATE TABLE public.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_checkout_session_id text NOT NULL UNIQUE,
  email text NOT NULL,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- billing_customers: users can read their own
CREATE POLICY "Users can read own billing" ON public.billing_customers
  FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

-- subscriptions: users can read via their billing_customer
CREATE POLICY "Users can read own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    billing_customer_id IN (
      SELECT id FROM public.billing_customers WHERE auth_user_id = auth.uid()
    )
  );

-- checkout_sessions: public read by session id (needed pre-auth)
CREATE POLICY "Anyone can read checkout by session id" ON public.checkout_sessions
  FOR SELECT TO anon, authenticated
  USING (true);

-- Service role will handle all inserts/updates via edge functions
-- Allow service_role full access (implicit), no public insert/update/delete

-- Triggers for updated_at
CREATE TRIGGER update_billing_customers_updated_at
  BEFORE UPDATE ON public.billing_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_billing_customers_email ON public.billing_customers(email);
CREATE INDEX idx_billing_customers_stripe_id ON public.billing_customers(stripe_customer_id);
CREATE INDEX idx_checkout_sessions_stripe_id ON public.checkout_sessions(stripe_checkout_session_id);
CREATE INDEX idx_subscriptions_billing_customer ON public.subscriptions(billing_customer_id);
