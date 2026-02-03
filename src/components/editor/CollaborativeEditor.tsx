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

// 模拟协作者数据
const mockCollaborators: Collaborator[] = [
  { id: "1", name: "张明", color: "collaboration", isOnline: true },
  { id: "2", name: "李华", color: "accent", isOnline: true },
  { id: "3", name: "王芳", color: "warning", isOnline: false },
];

const defaultContent = `
<h1>欢迎使用墨迹文档</h1>
<p>这是一个简洁优雅的协作文档编辑器，灵感来自江南水墨的意境。</p>

<h2>✨ 主要功能</h2>
<ul>
  <li><strong>富文本编辑</strong> - 支持标题、加粗、斜体、下划线、高亮等格式</li>
  <li><strong>表格支持</strong> - 可以插入和编辑表格</li>
  <li><strong>图片插入</strong> - 支持上传图片或通过链接插入</li>
  <li><strong>协作功能</strong> - 查看在线协作者状态</li>
  <li><strong>导出 PDF</strong> - 一键导出为 PDF 文件</li>
</ul>

<h2>📝 试试看</h2>
<p>开始编辑这段文字，体验流畅的编辑体验。你可以：</p>
<ol>
  <li>使用工具栏按钮设置文字格式</li>
  <li>点击表格按钮插入表格</li>
  <li>上传或链接图片到文档中</li>
  <li>完成后导出为 PDF 保存</li>
</ol>

<blockquote>
  <p>「墨迹淡远，意在笔先」—— 愿这款编辑器能带给你如行云流水般的书写体验。</p>
</blockquote>
`;

export const CollaborativeEditor = () => {
  const [title, setTitle] = useState("墨迹文档 - 协作演示");
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
        toast.success("图片已插入");
      }
    },
    [editor]
  );

  const handleExportPDF = useCallback(async () => {
    if (!editor) return;

    toast.loading("正在生成 PDF...", { id: "pdf-export" });

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
        filename: `${title || "文档"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();

      toast.success("PDF 导出成功！", { id: "pdf-export" });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("PDF 导出失败，请重试", { id: "pdf-export" });
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
