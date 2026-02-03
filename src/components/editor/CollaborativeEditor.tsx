import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { DocumentHeader } from "./DocumentHeader";
import { EditorToolbar } from "./EditorToolbar";
import { ImageUploadDialog } from "./ImageUploadDialog";
import { Collaborator } from "./CollaboratorAvatars";

// Mock collaborators data
const mockCollaborators: Collaborator[] = [
  { id: "1", name: "Alex Chen", color: "collaboration", isOnline: true },
  { id: "2", name: "Sarah Lee", color: "accent", isOnline: true },
  { id: "3", name: "Mike Wang", color: "warning", isOnline: false },
];

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
<p>Start editing this text to experience the smooth editing flow. You can:</p>
<ol>
  <li>Use the toolbar buttons to format your text</li>
  <li>Click the table button to insert a table</li>
  <li>Upload or link images into your document</li>
  <li>Export to PDF when you're done</li>
</ol>

<blockquote>
  <p>"Ink fades into the distance, meaning precedes the brush" — May this editor bring you a writing experience as fluid as flowing water.</p>
</blockquote>
`;

export const CollaborativeEditor = () => {
  const [title, setTitle] = useState("Ink Docs - Collaboration Demo");
  const [isSaved, setIsSaved] = useState(true);
  const [lastSaved, setLastSaved] = useState(new Date());
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [collaborators] = useState<Collaborator[]>(mockCollaborators);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
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
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: defaultContent,
    onUpdate: () => {
      setIsSaved(false);
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[60vh]",
      },
    },
  });

  // 自动保存模拟
  useEffect(() => {
    if (!isSaved) {
      const timer = setTimeout(() => {
        setIsSaved(true);
        setLastSaved(new Date());
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  const handleInsertImage = useCallback(
    (url: string) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run();
        toast.success("Image inserted");
      }
    },
    [editor]
  );

  const handleExportPDF = useCallback(async () => {
    if (!editor) return;

    toast.loading("Generating PDF...", { id: "pdf-export" });

    try {
      // Dynamic import for html2pdf
      const html2pdf = (await import("html2pdf.js")).default;

      const content = editor.getHTML();
      const element = document.createElement("div");
      element.innerHTML = content;
      element.className = "prose-ink p-8";
      element.style.cssText = `
        font-family: 'Noto Sans SC', system-ui, sans-serif;
        color: #263238;
        line-height: 1.8;
        max-width: 800px;
        margin: 0 auto;
      `;

      // Style tables
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

      // Style images
      element.querySelectorAll("img").forEach((img) => {
        img.style.cssText = "max-width: 100%; height: auto; border-radius: 8px;";
      });

      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `${title || "Document"}.pdf`,
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
  }, [editor, title]);

  return (
    <div className="min-h-screen bg-background">
      <DocumentHeader
        title={title}
        onTitleChange={setTitle}
        collaborators={collaborators}
        isSaved={isSaved}
        lastSaved={lastSaved}
      />

      <EditorToolbar
        editor={editor}
        onExportPDF={handleExportPDF}
        onInsertImage={() => setImageDialogOpen(true)}
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
    </div>
  );
};
