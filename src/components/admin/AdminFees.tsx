import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

interface FeeForm { program: string; annual_fee: string; duration: string; additional_info: string; }
const empty: FeeForm = { program: "", annual_fee: "", duration: "", additional_info: "" };

const AdminFees = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FeeForm>(empty);

  const { data: fees, isLoading } = useQuery({
    queryKey: ["admin-fees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_structure").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ id, ...values }: FeeForm & { id?: string }) => {
      const payload = { ...values, annual_fee: parseInt(values.annual_fee) };
      if (id) {
        const { error } = await supabase.from("fee_structure").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fee_structure").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-fees"] });
      setEditing(null); setAdding(false); setForm(empty);
      toast.success("Fee saved!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fee_structure").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-fees"] }); toast.success("Deleted!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const Fields = () => (
    <div className="grid grid-cols-2 gap-3">
      <Input placeholder="Program Name" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} />
      <Input placeholder="Annual Fee (₹)" type="number" value={form.annual_fee} onChange={(e) => setForm({ ...form, annual_fee: e.target.value })} />
      <Input placeholder="Duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
      <div className="col-span-2">
        <Textarea placeholder="Additional Info" value={form.additional_info} onChange={(e) => setForm({ ...form, additional_info: e.target.value })} rows={2} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Fee Structure</h2>
        <Button onClick={() => { setAdding(true); setForm(empty); }}><Plus className="h-4 w-4 mr-2" /> Add Fee</Button>
      </div>

      {adding && (
        <Card className="border-primary p-4 space-y-3">
          <Fields />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => upsert.mutate(form)}><Save className="h-4 w-4 mr-1" /> Save</Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          </div>
        </Card>
      )}

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Annual Fee</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees?.map((f) => (
                <TableRow key={f.id}>
                  {editing === f.id ? (
                    <TableCell colSpan={4}>
                      <div className="space-y-3">
                        <Fields />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => upsert.mutate({ id: f.id, ...form })}><Save className="h-4 w-4 mr-1" /> Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                        </div>
                      </div>
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="font-medium">{f.program}</TableCell>
                      <TableCell>₹{f.annual_fee.toLocaleString()}</TableCell>
                      <TableCell>{f.duration}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(f.id); setForm({ program: f.program, annual_fee: f.annual_fee.toString(), duration: f.duration, additional_info: f.additional_info || "" }); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {fees?.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No fees yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default AdminFees;
