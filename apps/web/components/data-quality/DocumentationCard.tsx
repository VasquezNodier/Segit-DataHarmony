"use client";

import { useState } from "react";
import { FileText, ExternalLink, X, Trash2, Paperclip, FileSpreadsheet, File } from "lucide-react";
import type { DQDocument } from "@/lib/api/data-quality";
import type { DrillingDocument } from "@/lib/api/drilling";

type DocumentLike = DQDocument | DrillingDocument;

interface DocumentationCardProps {
  document: DocumentLike;
  onDelete: (id: string) => void;
  onViewFile?: (doc: DocumentLike) => void;
}

const EXT_COLORS: Record<string, string> = {
  pdf: "bg-red-100 text-red-700",
  docx: "bg-blue-100 text-blue-700",
  doc: "bg-blue-100 text-blue-700",
  xlsx: "bg-emerald-100 text-emerald-700",
  xls: "bg-emerald-100 text-emerald-700",
  csv: "bg-emerald-100 text-emerald-700",
  pptx: "bg-orange-100 text-orange-700",
  ppt: "bg-orange-100 text-orange-700",
  txt: "bg-slate-100 text-slate-600",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileBadge({ fileName }: { fileName: string }) {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  const cls = EXT_COLORS[ext] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {ext || "archivo"}
    </span>
  );
}

export default function DocumentationCard({ document, onDelete, onViewFile }: DocumentationCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleDelete = () => {
    if (confirm(`¿Eliminar el documento "${document.title}"?`)) {
      onDelete(document.id);
    }
  };

  if (document.type === "file") {
    const ext = (document.fileName ?? "").split(".").pop()?.toLowerCase() ?? "";
    const IconComp = ext === "xlsx" || ext === "xls" || ext === "csv"
      ? FileSpreadsheet
      : ext === "pdf"
        ? FileText
        : ext === "docx" || ext === "doc"
          ? FileText
          : File;
    return (
      <div className="group rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-slate-300">
        <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
              <IconComp className="h-5 w-5" />
            </div>
            <button
              onClick={handleDelete}
              className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition"
              title="Eliminar documento"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-800 line-clamp-1">
            {document.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed line-clamp-2 min-h-[40px]">
            {document.description}
          </p>
          {document.fileName && (
            <div className="mt-2 flex items-center gap-2">
              <FileBadge fileName={document.fileName} />
              {document.fileSize != null && (
                <span className="text-xs text-slate-400">{formatBytes(document.fileSize)}</span>
              )}
            </div>
          )}
          <button
            onClick={() => onViewFile?.(document)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition"
          >
            <Paperclip className="h-4 w-4" />
            Ver archivo
          </button>
        </div>
      </div>
    );
  }

  if (document.type === "link") {
    return (
      <div className="group rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-slate-300">
        <div className="h-1.5 bg-gradient-to-r from-slate-500 to-slate-600" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-sm">
              <ExternalLink className="h-5 w-5" />
            </div>
            <button
              onClick={handleDelete}
              className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition"
              title="Eliminar documento"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-800 line-clamp-1">
            {document.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed line-clamp-3 min-h-[60px]">
            {document.description}
          </p>
          <a
            href={document.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir enlace
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="group rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-slate-300">
        <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-600" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <button
              onClick={handleDelete}
              className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition"
              title="Eliminar documento"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-800 line-clamp-1">
            {document.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed line-clamp-3 min-h-[60px]">
            {document.description}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100 transition"
          >
            <FileText className="h-4 w-4" />
            Ver documento
          </button>
        </div>
      </div>

      {modalOpen && (
        <MarkdownModal
          title={document.title}
          content={document.content ?? ""}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

function MarkdownModal({
  title,
  content,
  onClose,
}: {
  title: string;
  content: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-12 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">
          <MarkdownRenderer content={content} />
        </div>
      </div>
    </div>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="mt-6 mb-3 text-2xl font-bold text-slate-800 first:mt-0">
          {line.slice(2)}
        </h1>
      );
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="mt-5 mb-2 text-xl font-semibold text-slate-800 border-b border-slate-100 pb-1">
          {line.slice(3)}
        </h2>
      );
      i++; continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="mt-4 mb-1.5 text-base font-semibold text-slate-700">
          {line.slice(4)}
        </h3>
      );
      i++; continue;
    }
    if (line.startsWith("```")) {
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        blockLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="my-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100 font-mono leading-relaxed">
          {blockLines.join("\n")}
        </pre>
      );
      i++; continue;
    }
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const headers = tableLines[0].split("|").filter((c) => c.trim()).map((c) => c.trim());
      const rows = tableLines.slice(2).map((r) => r.split("|").filter((c) => c.trim()).map((c) => c.trim()));
      elements.push(
        <div key={i} className="my-3 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                {headers.map((h, j) => (
                  <th key={j} className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, j) => (
                <tr key={j} className="hover:bg-slate-50">
                  {row.map((cell, k) => (
                    <td key={k} className="border border-slate-200 px-3 py-2 text-slate-600">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="my-2 ml-4 space-y-1 list-disc text-slate-600 text-sm">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      );
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="my-2 ml-4 space-y-1 list-decimal text-slate-600 text-sm">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ol>
      );
      continue;
    }
    if (line === "---") {
      elements.push(<hr key={i} className="my-4 border-slate-200" />);
      i++; continue;
    }
    if (line.trim() === "") { i++; continue; }

    elements.push(
      <p key={i} className="my-2 text-sm leading-relaxed text-slate-600">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="prose-slate">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">{part.slice(1, -1)}</code>;
    return part;
  });
}
