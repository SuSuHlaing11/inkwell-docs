import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { History, User, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EditEntry {
  id: string;
  action: string;
  created_at: string;
  user_id: string;
  user_display_name?: string | null;
  user_email?: string | null;
}

interface HistoryPanelProps {
  documentId: string | null;
}

export const HistoryPanel = ({ documentId }: HistoryPanelProps) => {
  const [edits, setEdits] = useState<EditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    if (!documentId) return;

    setIsLoading(true);
    try {
      // First fetch edits
      const { data: editsData, error: editsError } = await supabase
        .from("document_edits")
        .select("id, action, created_at, user_id")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (editsError) throw editsError;

      // Then fetch profiles for all user_ids
      const userIds = [...new Set(editsData?.map(e => e.user_id).filter(Boolean) || [])];
      
      let profilesMap: Record<string, { display_name: string | null; email: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .in("user_id", userIds);
        
        profilesData?.forEach(p => {
          profilesMap[p.user_id] = { display_name: p.display_name, email: p.email };
        });
      }

      // Combine data
      const combined: EditEntry[] = (editsData || []).map(edit => ({
        ...edit,
        user_display_name: profilesMap[edit.user_id]?.display_name || null,
        user_email: profilesMap[edit.user_id]?.email || null,
      }));

      setEdits(combined);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchHistory();

      // Subscribe to realtime updates
      const channel = supabase
        .channel(`document_edits:${documentId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "document_edits",
            filter: `document_id=eq.${documentId}`,
          },
          () => {
            fetchHistory();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [documentId]);

  const getActionLabel = (action: string) => {
    switch (action) {
      case "created":
        return "Created document";
      case "edited":
        return "Made changes";
      case "title_changed":
        return "Changed title";
      case "imported":
        return "Imported document";
      default:
        return action;
    }
  };

  const getUserName = (edit: EditEntry) => {
    if (edit.user_display_name) return edit.user_display_name;
    if (edit.user_email) return edit.user_email.split("@")[0];
    return "Unknown user";
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Edit History</SheetTitle>
          <SheetDescription>
            View all changes made to this document
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : edits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No edit history yet</p>
              <p className="text-sm">Changes will appear here as you edit</p>
            </div>
          ) : (
            <div className="space-y-1">
              {edits.map((edit, index) => (
                <div key={edit.id}>
                  <div className="py-3 px-2 rounded-lg hover:bg-muted/50 ink-transition">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {getUserName(edit)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getActionLabel(edit.action)}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(edit.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < edits.length - 1 && <Separator className="my-1" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
