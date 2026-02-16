import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

const AdminChatQueries = () => {
  const { data: queries, isLoading } = useQuery({
    queryKey: ["admin-chat-queries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_queries")
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading queries...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Student Chat Queries</h2>
      {queries?.length === 0 ? (
        <p className="text-muted-foreground">No queries yet.</p>
      ) : (
        <ScrollArea className="h-[60vh]">
          <div className="space-y-3">
            {queries?.map((q) => (
              <Card key={q.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-sans font-medium">
                      {(q.profiles as any)?.full_name || (q.profiles as any)?.email || "Unknown"}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(q.created_at), "PPp")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-foreground mb-1">Q: {q.message}</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">A: {q.response}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default AdminChatQueries;
