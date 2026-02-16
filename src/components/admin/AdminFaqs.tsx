import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

const AdminFaqs = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "" });

  const { data: faqs, isLoading } = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faqs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ id, ...values }: { id?: string; question: string; answer: string }) => {
      if (id) {
        const { error } = await supabase.from("faqs").update(values).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faqs").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      setEditing(null);
      setAdding(false);
      setForm({ question: "", answer: "" });
      toast.success("FAQ saved!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faqs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      toast.success("FAQ deleted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (faq: any) => {
    setEditing(faq.id);
    setForm({ question: faq.question, answer: faq.answer });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Manage FAQs</h2>
        <Button onClick={() => { setAdding(true); setForm({ question: "", answer: "" }); }}>
          <Plus className="h-4 w-4 mr-2" /> Add FAQ
        </Button>
      </div>

      {adding && (
        <Card className="border-primary">
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            <Textarea placeholder="Answer" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => upsertMutation.mutate(form)}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : faqs?.length === 0 ? (
        <p className="text-muted-foreground">No FAQs yet. Add your first one!</p>
      ) : (
        faqs?.map((faq) => (
          <Card key={faq.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-sans">
                {editing === faq.id ? (
                  <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
                ) : (
                  faq.question
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing === faq.id ? (
                <div className="space-y-3">
                  <Textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => upsertMutation.mutate({ id: faq.id, ...form })}><Save className="h-4 w-4 mr-1" /> Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  <div className="flex gap-1 shrink-0 ml-4">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(faq)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(faq.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default AdminFaqs;
