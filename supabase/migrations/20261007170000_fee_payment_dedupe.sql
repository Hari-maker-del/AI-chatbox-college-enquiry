-- Prevent duplicate in-flight payment sessions for one invoice.
CREATE UNIQUE INDEX IF NOT EXISTS campus_fee_payments_one_active_intent_per_invoice
ON public.campus_fee_payments (invoice_id)
WHERE payment_status = 'initiated';
