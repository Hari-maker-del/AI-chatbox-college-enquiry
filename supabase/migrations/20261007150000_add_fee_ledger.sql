-- CampusOS fee ledger and payment intents
CREATE TABLE IF NOT EXISTS public.campus_fee_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Academic Fee',
  amount INTEGER NOT NULL CHECK (amount > 0),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partially_paid','paid','overdue','cancelled')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campus_fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.campus_fee_invoices(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  payment_status TEXT NOT NULL DEFAULT 'initiated' CHECK (payment_status IN ('initiated','pending','paid','failed','cancelled')),
  payment_method TEXT,
  transaction_ref TEXT UNIQUE,
  gateway TEXT,
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE public.campus_fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_fee_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students read own fee invoices" ON public.campus_fee_invoices;
CREATE POLICY "Students read own fee invoices" ON public.campus_fee_invoices FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage fee invoices" ON public.campus_fee_invoices;
CREATE POLICY "Admins manage fee invoices" ON public.campus_fee_invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Students read own payments" ON public.campus_fee_payments;
CREATE POLICY "Students read own payments" ON public.campus_fee_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Students create own payment intents" ON public.campus_fee_payments;
CREATE POLICY "Students create own payment intents" ON public.campus_fee_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND payment_status = 'initiated');

DROP POLICY IF EXISTS "Admins manage payments" ON public.campus_fee_payments;
CREATE POLICY "Admins manage payments" ON public.campus_fee_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS campus_fee_invoices_user_status_idx ON public.campus_fee_invoices(user_id,status);
CREATE INDEX IF NOT EXISTS campus_fee_invoices_due_idx ON public.campus_fee_invoices(due_date);
CREATE INDEX IF NOT EXISTS campus_fee_payments_user_idx ON public.campus_fee_payments(user_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.update_campus_fee_invoice_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  paid_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO paid_total
  FROM public.campus_fee_payments
  WHERE invoice_id = NEW.invoice_id AND payment_status = 'paid';

  IF NEW.invoice_id IS NOT NULL THEN
    UPDATE public.campus_fee_invoices
    SET status = CASE
      WHEN paid_total >= amount THEN 'paid'
      WHEN paid_total > 0 THEN 'partially_paid'
      WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END,
    updated_at = now()
    WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campus_fee_payment_status_trigger ON public.campus_fee_payments;
CREATE TRIGGER campus_fee_payment_status_trigger
AFTER INSERT OR UPDATE OF payment_status, amount, invoice_id ON public.campus_fee_payments
FOR EACH ROW EXECUTE FUNCTION public.update_campus_fee_invoice_status();

CREATE OR REPLACE FUNCTION public.notify_fee_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.payment_status = 'initiated' THEN
    INSERT INTO public.campus_notifications(user_id,title,message,type,entity_type,entity_id,action_label,action_target)
    VALUES (NEW.user_id,'Payment session created','Your fee payment session is ready to continue.','payment','fee_payment',NEW.id,'VIEW PAYMENT','payments');
  ELSIF TG_OP = 'UPDATE' AND NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.campus_notifications(user_id,title,message,type,entity_type,entity_id,action_label,action_target)
    VALUES (
      NEW.user_id,
      CASE NEW.payment_status WHEN 'paid' THEN 'Payment successful' WHEN 'failed' THEN 'Payment failed' ELSE 'Payment status updated' END,
      CASE NEW.payment_status WHEN 'paid' THEN 'Your payment was recorded successfully.' WHEN 'failed' THEN 'Your payment could not be completed.' ELSE 'Your fee payment status has changed.' END,
      'payment','fee_payment',NEW.id,'VIEW PAYMENTS','payments'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campus_fee_payment_notification_trigger ON public.campus_fee_payments;
CREATE TRIGGER campus_fee_payment_notification_trigger
AFTER INSERT OR UPDATE OF payment_status ON public.campus_fee_payments
FOR EACH ROW EXECUTE FUNCTION public.notify_fee_payment();
