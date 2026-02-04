import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Check, Cloud, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { HistoryPanel } from "./HistoryPanel";
import { toast } from "sonner";

interface DocumentHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  isSaved: boolean;
  lastSaved?: Date;
  documentId: string | null;
}

export const DocumentHeader = ({
  title,
  onTitleChange,
  isSaved,
  lastSaved,
  documentId,
}: DocumentHeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes < 1) return "Just saved";
    if (minutes < 60) return `Saved ${minutes} min ago`;
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
              className="h-8 text-lg font-semibold bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary p-0"
              autoFocus
            />
          ) : (
            <h1
              className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary ink-transition"
              onClick={() => setIsEditing(true)}
            >
              {title || "Untitled Document"}
            </h1>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isSaved ? (
              <>
                <Cloud className="h-3 w-3" />
                <span>{lastSaved ? formatLastSaved(lastSaved) : "Saved to cloud"}</span>
                <Check className="h-3 w-3 text-success" />
              </>
            ) : (
              <span className="text-warning">Saving...</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <HistoryPanel documentId={documentId} />
        
        {user && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.email?.split("@")[0]}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
