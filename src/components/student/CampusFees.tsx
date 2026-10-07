import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createPaymentIntent, listStudentFees, listStudentPayments, type CampusFeeInvoice, type CampusFeePayment } from "@/lib/campusos";

const money = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;
const statusLabel = (s: string) => s.replaceAll("_", " ").replace(/\\b\\w/g, (c) => c.toUpperCase());

export default function CampusFees({ userId, onPay }: { userId: string; onPay?: (invoice: CampusFeeInvoice) => void }) {
  const [fees, setFees] = useState<CampusFeeInvoice[]>([]);
  const [payments, setPayments] = useState<CampusFeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextFees, nextPayments] = await Promise.all([listStudentFees(userId), listStudentPayments(userId)]);
      setFees(nextFees); setPayments(nextPayments);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load fee records.");
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const pending = useMemo(() => fees.filter((f) => ["pending","partially_paid","overdue"].includes(f.status)), [fees]);
  const totalDue = pending.reduce((sum, f) => sum + f.amount, 0);
  const paid = payments.filter((p) => p.payment_status === "paid").reduce((sum, p) => sum + p.amount, 0);

  const startPayment = async (invoice: CampusFeeInvoice) => {
    setPaying(invoice.id);
    try {
      const payment = await createPaymentIntent({ userId, invoiceId: invoice.id });
      onPay?.(invoice);
      toast.success(`Payment session ${payment.transaction_ref} created. Continue through the configured payment gateway.`);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create payment session."); }
    finally { setPaying(null); }
  };

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="border border-[#17252A]/10 bg-white p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-[#4E6265]">Total due</div><div className="mt-2 text-2xl font-black text-[#17252A]">{money(totalDue)}</div></div>
        <div className="border border-[#17252A]/10 bg-white p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-[#4E6265]">Recorded paid</div><div className="mt-2 text-2xl font-black text-[#17252A]">{money(paid)}</div></div>
        <div className="border border-[#17252A]/10 bg-[#DEF2F1] p-4 col-span-2 md:col-span-1"><div className="text-[10px] uppercase tracking-[0.16em] text-[#2B7A78]">Open invoices</div><div className="mt-2 text-2xl font-black text-[#17252A]">{pending.length}</div></div>
      </div>
      <div className="border border-[#17252A]/10 bg-white">
        <div className="border-b border-[#17252A]/10 px-5 py-4"><h3 className="font-black uppercase tracking-tight text-[#17252A]">FEE LEDGER</h3><p className="mt-1 text-xs text-[#4E6265]">Amounts and statuses come from your CampusOS account.</p></div>
        <div className="divide-y divide-[#17252A]/10">
          {loading ? <div className="p-6 text-sm text-[#4E6265]">Loading fee records...</div> : fees.length === 0 ? <div className="p-8 text-center text-sm text-[#4E6265]">No fee invoices have been assigned to your account.</div> : fees.map((fee) => (
            <div key={fee.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div><div className="font-bold text-[#17252A]">{fee.title}</div><div className="mt-1 text-xs text-[#4E6265]">{fee.category}{fee.due_date ? ` · Due ${new Date(fee.due_date).toLocaleDateString()}` : ""}</div>{fee.description && <div className="mt-2 text-sm text-[#4E6265]">{fee.description}</div>}</div>
              <div className="flex items-center gap-3"><div className="text-lg font-black text-[#17252A]">{money(fee.amount)}</div><Badge variant="outline">{statusLabel(fee.status)}</Badge>{pending.includes(fee) && <Button size="sm" disabled={paying === fee.id} onClick={() => void startPayment(fee)}>{paying === fee.id ? "CREATING..." : "PAY NOW"}</Button>}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="border border-[#17252A]/10 bg-white">
        <div className="border-b border-[#17252A]/10 px-5 py-4"><h3 className="font-black uppercase tracking-tight text-[#17252A]">PAYMENT HISTORY</h3></div>
        {payments.length === 0 ? <div className="p-6 text-sm text-[#4E6265]">No payment attempts yet.</div> : <div className="divide-y divide-[#17252A]/10">{payments.map((p) => <div key={p.id} className="p-4 flex justify-between gap-4 text-sm"><div><div className="font-medium">{p.transaction_ref || p.id.slice(0,8).toUpperCase()}</div><div className="text-xs text-[#4E6265]">{new Date(p.created_at).toLocaleString()} · {p.payment_method || "Gateway pending"}</div></div><div className="text-right"><div className="font-bold">{money(p.amount)}</div><div className="text-xs uppercase text-[#2B7A78]">{statusLabel(p.payment_status)}</div></div></div>)}</div>}
      </div>
    </section>
  );
}
