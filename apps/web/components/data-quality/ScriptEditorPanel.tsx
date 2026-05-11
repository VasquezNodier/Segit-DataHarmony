"use client";

import { useState, useEffect } from "react";
import {
  X,
  Pencil,
  Save,
  Loader2,
  Check,
  FileCode2,
  Terminal,
  Database,
} from "lucide-react";
import CodeEditor from "./CodeEditor";
import type { DQScript } from "@/lib/api/data-quality";
import type { DrillingScript } from "@/lib/api/drilling";
import { updateScriptContent as defaultUpdateScriptContent } from "@/lib/api/data-quality";
import type { ApiClientOptions } from "@/lib/api/client";

type ScriptLike = DQScript | DrillingScript;

interface ScriptEditorPanelProps {
  script: ScriptLike | null;
  initialEditMode?: boolean;
  onClose: () => void;
  onSaved: (id: string, newContent: string) => void;
  apiOptions?: ApiClientOptions;
  /** Si se omite, se usa el endpoint de Data Quality. */
  updateScriptContent?: (
    id: string,
    content: string,
    opts?: ApiClientOptions
  ) => Promise<void>;
}

const LANGUAGE_CONFIG = {
  python: {
    label: "Python",
    icon: FileCode2,
    gradient: "from-blue-500 to-indigo-600",
    badge: "bg-blue-100 text-blue-700",
  },
  bash: {
    label: "Bash",
    icon: Terminal,
    gradient: "from-emerald-500 to-green-600",
    badge: "bg-emerald-100 text-emerald-700",
  },
  sql: {
    label: "SQL",
    icon: Database,
    gradient: "from-amber-500 to-orange-600",
    badge: "bg-amber-100 text-amber-700",
  },
} as const;

export default function ScriptEditorPanel({
  script,
  initialEditMode = false,
  onClose,
  onSaved,
  apiOptions = {},
  updateScriptContent = defaultUpdateScriptContent,
}: ScriptEditorPanelProps) {
  const [editing, setEditing] = useState(initialEditMode);
  const [content, setContent] = useState(script?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Sync state when script changes
  useEffect(() => {
    setContent(script?.content ?? "");
    setEditing(initialEditMode);
    setSaved(false);
  }, [script, initialEditMode]);

  // Close with Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!script) return null;

  const config = LANGUAGE_CONFIG[script.language] ?? LANGUAGE_CONFIG.python;
  const Icon = config.icon;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateScriptContent(script.id, content, apiOptions);
      onSaved(script.id, content);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(script.content);
    setEditing(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className={`flex-shrink-0 bg-gradient-to-r ${config.gradient} px-5 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white leading-tight">
                  {script.name}
                </h2>
                <span className="text-xs text-white/70">{script.description}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                {config.label}
              </span>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition"
                title="Cerrar panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            {editing ? (
              <span className="flex items-center gap-1 text-cyan-600 font-medium">
                <Pencil className="h-3.5 w-3.5" />
                Modo edición activo
              </span>
            ) : (
              <span>Solo lectura</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                <Check className="h-3.5 w-3.5" />
                Guardado
              </span>
            )}

            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 transition disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Guardar
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-cyan-50 hover:border-cyan-200 hover:text-cyan-700 transition"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            )}
          </div>
        </div>

        {/* Editor — fills remaining height, scrolls internally */}
        <div className="flex-1 min-h-0">
          <CodeEditor
            value={content}
            language={script.language}
            readOnly={!editing}
            onChange={setContent}
            height="100%"
          />
        </div>
      </div>
    </>
  );
}
