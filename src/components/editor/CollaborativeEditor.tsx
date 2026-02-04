import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useDocument";
import { DocumentHeader } from "./DocumentHeader";
import { EditorToolbar } from "./EditorToolbar";
import { ImageUploadDialog } from "./ImageUploadDialog";
import { FileImportDialog } from "./FileImportDialog";
import { HistoryPanel } from "./HistoryPanel";
import { FontSize } from "./FontSizeExtension";
import { Loader2 } from "lucide-react";

export const CollaborativeEditor = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { document, isLoading: docLoading, isSaving, saveDocument, updateTitle, logEdit, importContent } = useDocument();
  
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState(new Date());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editLogTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      TextStyle,
      FontSize,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: "",
    onUpdate: ({ editor }) => {
      // Debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument(editor.getHTML());
        setLastSaved(new Date());
      }, 1500);

      // Debounced edit log (less frequent)
      if (editLogTimeoutRef.current) {
        clearTimeout(editLogTimeoutRef.current);
      }
      editLogTimeoutRef.current = setTimeout(() => {
        logEdit("edited");
      }, 10000); // Log edit every 10 seconds of activity
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[60vh]",
      },
    },
  });

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Load document content into editor
  useEffect(() => {
    if (editor && document?.content) {
      editor.commands.setContent(document.content);
    }
  }, [editor, document?.content]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (editLogTimeoutRef.current) clearTimeout(editLogTimeoutRef.current);
    };
  }, []);

  const handleInsertImage = useCallback(
    (url: string) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run();
        toast.success("Image inserted");
      }
    },
    [editor]
  );

  const handleImportFile = useCallback(
    (html: string, fileName: string) => {
      if (editor) {
        editor.commands.setContent(html);
        importContent(html, fileName);
      }
    },
    [editor, importContent]
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      updateTitle(newTitle);
    },
    [updateTitle]
  );

  const handleExportPDF = useCallback(async () => {
    if (!editor) return;

    toast.loading("Generating PDF...", { id: "pdf-export" });

    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const content = editor.getHTML();
      const element = window.document.createElement("div");
      element.innerHTML = content;
      element.className = "prose-ink p-8";
      element.style.cssText = `
        font-family: 'Noto Sans SC', system-ui, sans-serif;
        color: #263238;
        line-height: 1.8;
        max-width: 800px;
        margin: 0 auto;
      `;

      element.querySelectorAll("table").forEach((table) => {
        table.style.cssText =
          "width: 100%; border-collapse: collapse; margin: 16px 0;";
      });
      element.querySelectorAll("td, th").forEach((cell) => {
        (cell as HTMLElement).style.cssText =
          "border: 1px solid #90A4AE; padding: 8px 12px;";
      });
      element.querySelectorAll("th").forEach((th) => {
        (th as HTMLElement).style.cssText +=
          "background-color: #F5F5F5; font-weight: 600;";
      });
      element.querySelectorAll("img").forEach((img) => {
        img.style.cssText = "max-width: 100%; height: auto; border-radius: 8px;";
      });

      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `${document?.title || "Document"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();

      toast.success("PDF exported successfully!", { id: "pdf-export" });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("PDF export failed, please try again", { id: "pdf-export" });
    }
  }, [editor, document?.title]);

  if (authLoading || docLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DocumentHeader
        title={document?.title || "Untitled Document"}
        onTitleChange={handleTitleChange}
        isSaved={!isSaving}
        lastSaved={lastSaved}
        documentId={document?.id || null}
      />

      <EditorToolbar
        editor={editor}
        onExportPDF={handleExportPDF}
        onInsertImage={() => setImageDialogOpen(true)}
        onImportFile={() => setImportDialogOpen(true)}
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-card rounded-lg shadow-ink-lg border border-border p-8 md:p-12 min-h-[70vh]">
          <EditorContent editor={editor} />
        </div>
      </main>

      <ImageUploadDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onInsert={handleInsertImage}
      />

      <FileImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImportFile}
      />
    </div>
  );
};
