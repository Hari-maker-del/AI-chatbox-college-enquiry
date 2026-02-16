import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

interface CourseForm {
  name: string;
  level: string;
  duration: string;
  annual_fee: string;
  description: string;
}

const empty: CourseForm = { name: "", level: "Undergraduate", duration: "", annual_fee: "", description: "" };

const AdminCourses = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<CourseForm>(empty);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ id, ...values }: CourseForm & { id?: string }) => {
      const payload = { ...values, annual_fee: values.annual_fee ? parseInt(values.annual_fee) : null };
      if (id) {
        const { error } = await supabase.from("courses").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      setEditing(null); setAdding(false); setForm(empty);
      toast.success("Course saved!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-courses"] }); toast.success("Deleted!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (c: any) => {
    setEditing(c.id);
    setForm({ name: c.name, level: c.level, duration: c.duration, annual_fee: c.annual_fee?.toString() || "", description: c.description || "" });
  };

  const FormFields = () => (
    <div className="grid grid-cols-2 gap-3">
      <Input placeholder="Course Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input placeholder="Level (e.g. Undergraduate)" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
      <Input placeholder="Duration (e.g. 4 Years)" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
      <Input placeholder="Annual Fee (₹)" type="number" value={form.annual_fee} onChange={(e) => setForm({ ...form, annual_fee: e.target.value })} />
      <div className="col-span-2">
        <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Manage Courses</h2>
        <Button onClick={() => { setAdding(true); setForm(empty); }}><Plus className="h-4 w-4 mr-2" /> Add Course</Button>
      </div>

      {adding && (
        <Card className="border-primary">
          <CardContent className="pt-4 space-y-3">
            <FormFields />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => upsert.mutate(form)}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses?.map((c) => (
                <TableRow key={c.id}>
                  {editing === c.id ? (
                    <TableCell colSpan={5}>
                      <div className="space-y-3">
                        <FormFields />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => upsert.mutate({ id: c.id, ...form })}><Save className="h-4 w-4 mr-1" /> Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                        </div>
                      </div>
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.level}</TableCell>
                      <TableCell>{c.duration}</TableCell>
                      <TableCell>{c.annual_fee ? `₹${c.annual_fee.toLocaleString()}` : "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {courses?.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No courses yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default AdminCourses;
