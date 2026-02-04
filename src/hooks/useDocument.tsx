import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Document {
  id: string;
  title: string;
  content: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export const useDocument = () => {
  const { user } = useAuth();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch or create document for current user
  const initDocument = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Try to get existing document
      const { data: docs, error: fetchError } = await supabase
        .from("documents")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (docs && docs.length > 0) {
        setDocument(docs[0]);
      } else {
        // Create new document
        const defaultContent = `
<h1>Welcome to Ink Docs</h1>
<p>A clean and elegant collaborative document editor, inspired by traditional ink wash aesthetics.</p>

<h2>✨ Key Features</h2>
<ul>
  <li><strong>Rich Text Editing</strong> - Support for headings, bold, italic, underline, highlight and more</li>
  <li><strong>Table Support</strong> - Insert and edit tables with ease</li>
  <li><strong>Image Insertion</strong> - Upload images or insert via URL</li>
  <li><strong>Collaboration</strong> - See who's online and working with you</li>
  <li><strong>PDF Export</strong> - Export your document with one click</li>
</ul>

<h2>📝 Try It Out</h2>
<p>Start editing this text to experience the smooth editing flow.</p>
`;

        const { data: newDoc, error: createError } = await supabase
          .from("documents")
          .insert({
            owner_id: user.id,
            title: "Untitled Document",
            content: defaultContent,
          })
          .select()
          .single();

        if (createError) throw createError;

        setDocument(newDoc);

        // Log creation
        await supabase.from("document_edits").insert({
          document_id: newDoc.id,
          user_id: user.id,
          action: "created",
        });
      }
    } catch (error) {
      console.error("Failed to init document:", error);
      toast.error("Failed to load document");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    initDocument();
  }, [initDocument]);

  const saveDocument = useCallback(
    async (content: string) => {
      if (!document || !user) return;

      setIsSaving(true);
      try {
        const { error } = await supabase
          .from("documents")
          .update({ content })
          .eq("id", document.id);

        if (error) throw error;

        setDocument((prev) => (prev ? { ...prev, content, updated_at: new Date().toISOString() } : null));
      } catch (error) {
        console.error("Failed to save document:", error);
        toast.error("Failed to save document");
      } finally {
        setIsSaving(false);
      }
    },
    [document, user]
  );

  const updateTitle = useCallback(
    async (title: string) => {
      if (!document || !user) return;

      try {
        const { error } = await supabase
          .from("documents")
          .update({ title })
          .eq("id", document.id);

        if (error) throw error;

        setDocument((prev) => (prev ? { ...prev, title } : null));

        await supabase.from("document_edits").insert({
          document_id: document.id,
          user_id: user.id,
          action: "title_changed",
        });
      } catch (error) {
        console.error("Failed to update title:", error);
        toast.error("Failed to update title");
      }
    },
    [document, user]
  );

  const logEdit = useCallback(
    async (action: string = "edited") => {
      if (!document || !user) return;

      try {
        await supabase.from("document_edits").insert({
          document_id: document.id,
          user_id: user.id,
          action,
        });
      } catch (error) {
        console.error("Failed to log edit:", error);
      }
    },
    [document, user]
  );

  const importContent = useCallback(
    async (content: string, fileName: string) => {
      if (!document || !user) return;

      try {
        const { error } = await supabase
          .from("documents")
          .update({ 
            content,
            title: fileName.replace(/\.(doc|docx)$/i, ""),
          })
          .eq("id", document.id);

        if (error) throw error;

        setDocument((prev) => 
          prev ? { 
            ...prev, 
            content, 
            title: fileName.replace(/\.(doc|docx)$/i, ""),
            updated_at: new Date().toISOString() 
          } : null
        );

        await supabase.from("document_edits").insert({
          document_id: document.id,
          user_id: user.id,
          action: "imported",
        });
      } catch (error) {
        console.error("Failed to import content:", error);
        toast.error("Failed to import document");
      }
    },
    [document, user]
  );

  return {
    document,
    isLoading,
    isSaving,
    saveDocument,
    updateTitle,
    logEdit,
    importContent,
  };
};
