import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Pilcrow,
  Undo2,
  Redo2,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Disable features we don't want
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] px-3 py-2 focus:outline-none " +
          "[&_h2]:font-heading [&_h2]:text-lg [&_h2]:mt-3 [&_h2]:mb-2 " +
          "[&_h3]:font-heading [&_h3]:text-base [&_h3]:mt-2 [&_h3]:mb-1 " +
          "[&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Treat empty editor as empty string
      onChange(html === "<p></p>" ? "" : html);
    },
    immediatelyRender: false,
  });

  // Sync external value changes (e.g. after AI import)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next && next !== current) {
      editor.commands.setContent(next, { emitUpdate: false });
    } else if (!next && current !== "<p></p>") {
      editor.commands.clearContent(false);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded border border-border bg-background">
      <Toolbar editor={editor} />
      <div className="border-t border-border">
        <EditorContent editor={editor} placeholder={placeholder} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-ink disabled:opacity-40";
  const active = "bg-muted text-ink";
  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
      <button
        type="button"
        title="Paragraph"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`${btn} ${editor.isActive("paragraph") ? active : ""}`}
      >
        <Pilcrow className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Heading 2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`${btn} ${editor.isActive("heading", { level: 2 }) ? active : ""}`}
      >
        <Heading2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Heading 3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`${btn} ${editor.isActive("heading", { level: 3 }) ? active : ""}`}
      >
        <Heading3 className="h-4 w-4" />
      </button>
      <div className="mx-1 h-5 w-px bg-border" />
      <button
        type="button"
        title="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btn} ${editor.isActive("bold") ? active : ""}`}
      >
        <BoldIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btn} ${editor.isActive("italic") ? active : ""}`}
      >
        <ItalicIcon className="h-4 w-4" />
      </button>
      <div className="mx-1 h-5 w-px bg-border" />
      <button
        type="button"
        title="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${btn} ${editor.isActive("bulletList") ? active : ""}`}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${btn} ${editor.isActive("orderedList") ? active : ""}`}
      >
        <ListOrdered className="h-4 w-4" />
      </button>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={btn}
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={btn}
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
