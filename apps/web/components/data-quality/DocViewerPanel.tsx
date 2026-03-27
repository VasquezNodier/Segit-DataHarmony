"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  File,
  AlertTriangle,
  Loader2,
  Presentation,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import type { DQDocument } from "@/lib/api/data-quality";
import type { DrillingDocument } from "@/lib/api/drilling";

// ── Types ──────────────────────────────────────────────────────────────────────

type PreviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "pdf" }
  | { status: "image" }
  | { status: "text"; content: string; ext: string }
  | { status: "xlsx"; sheetNames: string[]; sheets: Record<string, (string | number | boolean | null)[][]> }
  | { status: "docx"; html: string }
  | { status: "info"; message: string }
  | { status: "unsupported"; mimeType: string; fileName: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extFromFileName(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}

// ── File type badge ────────────────────────────────────────────────────────────

const EXT_COLORS: Record<string, string> = {
  pdf:  "bg-red-100 text-red-700",
  docx: "bg-blue-100 text-blue-700",
  doc:  "bg-blue-100 text-blue-700",
  xlsx: "bg-emerald-100 text-emerald-700",
  xls:  "bg-emerald-100 text-emerald-700",
  csv:  "bg-emerald-100 text-emerald-700",
  pptx: "bg-orange-100 text-orange-700",
  potx: "bg-orange-100 text-orange-700",
  ppt:  "bg-orange-100 text-orange-700",
  txt:  "bg-slate-100 text-slate-600",
  las:  "bg-teal-100 text-teal-700",
  lis:  "bg-teal-100 text-teal-700",
  dlis: "bg-teal-100 text-teal-700",
  png:  "bg-pink-100 text-pink-700",
  jpg:  "bg-pink-100 text-pink-700",
  jpeg: "bg-pink-100 text-pink-700",
  gif:  "bg-pink-100 text-pink-700",
  webp: "bg-pink-100 text-pink-700",
};

function FileBadge({ fileName }: { fileName: string }) {
  const ext = extFromFileName(fileName);
  const cls = EXT_COLORS[ext] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {ext || "archivo"}
    </span>
  );
}

// ── XLSX sheet table ───────────────────────────────────────────────────────────

function SheetTable({ rows }: { rows: (string | number | boolean | null)[][] }) {
  if (rows.length === 0)
    return <p className="px-4 py-6 text-center text-sm text-slate-400">Hoja vacía</p>;
  const header = rows[0];
  const body = rows.slice(1);
  return (
    <div className="overflow-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="sticky top-0 bg-slate-100">
            {header.map((cell, i) => (
              <th
                key={i}
                className="whitespace-nowrap border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700"
              >
                {cell ?? ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              {header.map((_, ci) => (
                <td
                  key={ci}
                  className="whitespace-nowrap border border-slate-200 px-3 py-1.5 text-slate-600"
                >
                  {row[ci] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ── Main component ─────────────────────────────────────────────────────────────

export default function DocViewerPanel({
  doc,
  onClose,
}: {
  doc: DQDocument;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<PreviewState>({ status: "loading" });
  const [activeSheet, setActiveSheet] = useState(0);
  const backdropRef = useRef<HTMLDivElement>(null);

  const fileUrl = `/api/${filesRoutePrefix}/files/${doc.fileId}`;
  const previewUrl = `/api/${filesRoutePrefix}/files/${doc.fileId}/preview`;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Fetch preview
  useEffect(() => {
    if (!doc.fileId) {
      setPreview({ status: "unsupported", mimeType: "", fileName: doc.fileName ?? "" });
      return;
    }
    setPreview({ status: "loading" });

    const ctrl = new AbortController();
    fetch(previewUrl, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setPreview({ status: "error", message: data.error });
        } else if (data.type === "pdf") {
          setPreview({ status: "pdf" });
        } else if (data.type === "image") {
          setPreview({ status: "image" });
        } else if (data.type === "text") {
          setPreview({ status: "text", content: data.content, ext: data.ext ?? "" });
        } else if (data.type === "xlsx") {
          setPreview({ status: "xlsx", sheetNames: data.sheetNames, sheets: data.sheets });
        } else if (data.type === "docx") {
          setPreview({ status: "docx", html: data.html });
        } else if (data.type === "pptx_legacy") {
          setPreview({ status: "info", message: data.info ?? "Vista previa no disponible." });
        } else {
          setPreview({
            status: "unsupported",
            mimeType: data.mimeType ?? "",
            fileName: data.fileName ?? doc.fileName ?? "",
          });
        }
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setPreview({ status: "error", message: String(err) });
        }
      });

    return () => ctrl.abort();
  }, [doc.fileId, previewUrl]);

  // Icon for header
  const ext = extFromFileName(doc.fileName ?? "");
  const HeaderIcon =
    ext === "pdf"
      ? FileText
      : ["xlsx", "xls", "csv"].includes(ext)
      ? FileSpreadsheet
      : ["pptx", "potx", "ppt"].includes(ext)
      ? Presentation
      : ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)
      ? ImageIcon
      : File;

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40 backdrop-blur-sm"
    >
      {/* Panel */}
      <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <HeaderIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-slate-800">{doc.title}</h2>
              {doc.fileName && <FileBadge fileName={doc.fileName} />}
            </div>
            {doc.fileName && (
              <p className="truncate text-xs text-slate-500">
                {doc.fileName}
                {doc.fileSize ? ` · ${formatBytes(doc.fileSize)}` : ""}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={fileUrl}
              download={doc.fileName}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              title="Descargar archivo"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden">

          {/* Loading */}
          {preview.status === "loading" && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            </div>
          )}

          {/* Error */}
          {preview.status === "error" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <AlertTriangle className="h-10 w-10 text-red-400" />
              <p className="text-sm font-medium text-slate-700">Error al cargar la vista previa</p>
              <p className="text-xs text-slate-500">{preview.message}</p>
            </div>
          )}

          {/* PDF */}
          {preview.status === "pdf" && (
            <object data={fileUrl} type="application/pdf" className="h-full w-full">
              <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
                <File className="h-10 w-10 text-red-400" />
                <p className="text-sm font-medium text-slate-700">
                  El navegador no puede mostrar el PDF en línea.
                </p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
                >
                  <Download className="h-4 w-4" />
                  Abrir PDF
                </a>
              </div>
            </object>
          )}

          {/* Image */}
          {preview.status === "image" && (
            <div className="flex h-full items-center justify-center overflow-auto bg-slate-100 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={doc.title}
                className="max-h-full max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
          )}

          {/* Plain text / LAS / LIS / code */}
          {preview.status === "text" && (
            <div className="h-full overflow-auto bg-slate-900 p-4">
              {["las", "lis"].includes(preview.ext) && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-teal-900/60 px-3 py-2">
                  <Info className="h-4 w-4 shrink-0 text-teal-400" />
                  <p className="text-xs text-teal-300">
                    Archivo de registro de pozo ({preview.ext.toUpperCase()}) — mostrando datos ASCII
                  </p>
                </div>
              )}
              <pre className="font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                {preview.content}
              </pre>
            </div>
          )}

          {/* DOCX */}
          {preview.status === "docx" && (
            <div className="h-full overflow-auto p-6">
              <div
                className="prose prose-sm max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
            </div>
          )}

          {/* XLSX */}
          {preview.status === "xlsx" && (
            <div className="flex h-full flex-col">
              {preview.sheetNames.length > 1 && (
                <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 pt-2">
                  {preview.sheetNames.map((name, i) => (
                    <button
                      key={name}
                      onClick={() => setActiveSheet(i)}
                      className={`rounded-t-lg border border-b-0 px-4 py-2 text-xs font-medium transition ${
                        activeSheet === i
                          ? "border-slate-200 bg-white text-slate-800"
                          : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 overflow-auto">
                <SheetTable rows={preview.sheets[preview.sheetNames[activeSheet]] ?? []} />
              </div>
            </div>
          )}

          {/* Info (PPT, PPTX, POTX, DLIS, etc.) */}
          {preview.status === "info" && (
            <div className="flex h-full flex-col items-center justify-center gap-5 px-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
                <Info className="h-8 w-8 text-amber-600" />
              </div>
              <div className="max-w-sm">
                <p className="text-sm font-medium text-slate-700">Vista previa no disponible</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{preview.message}</p>
              </div>
              <a
                href={fileUrl}
                download={doc.fileName}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
              >
                <Download className="h-4 w-4" />
                Descargar archivo
              </a>
            </div>
          )}

          {/* Truly unsupported */}
          {preview.status === "unsupported" && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <File className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Vista previa no disponible</p>
                <p className="mt-1 text-xs text-slate-500">
                  {doc.fileName
                    ? `Tipo de archivo: ${extFromFileName(doc.fileName).toUpperCase()}`
                    : "No se puede previsualizar este archivo."}
                </p>
              </div>
              <a
                href={fileUrl}
                download={doc.fileName}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition"
              >
                <Download className="h-4 w-4" />
                Descargar archivo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
