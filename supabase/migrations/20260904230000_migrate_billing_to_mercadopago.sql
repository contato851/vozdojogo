-- Replace Stripe-specific billing columns/tables with Mercado Pago equivalents.
-- mp_payer_id is nullable: unlike Stripe (where we created the customer object
-- upfront), Mercado Pago only tells us the payer_id once the webhook confirms
-- the preapproval.
alter table public.billing_customers rename column stripe_customer_id to mp_payer_id;
alter table public.billing_customers alter column mp_payer_id drop not null;

alter table public.subscriptions rename column stripe_subscription_id to mp_preapproval_id;
alter table public.subscriptions drop column stripe_price_id;
-- Mercado Pago has no built-in past_due/grace-period status like Stripe --
-- the webhook sets this deadline itself when a recurring charge fails.
alter table public.subscriptions add column grace_deadline timestamptz;

-- Confirmed orphaned: only used by the dead onboarding edge functions, for a
-- flow whose frontend (src/components/onboarding/) no longer exists.
drop table if exists public.checkout_sessions;

-- Confirmed unused elsewhere in the codebase.
alter table public.user_profiles drop column if exists stripe_customer_id;
alter table public.user_profiles drop column if exists stripe_subscription_id;
