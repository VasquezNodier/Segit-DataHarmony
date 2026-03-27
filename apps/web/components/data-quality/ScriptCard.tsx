"use client";

import { FileCode2, Database, Terminal, Eye, Pencil, Trash2 } from "lucide-react";
import type { DQScript } from "@/lib/api/data-quality";
import type { DrillingScript } from "@/lib/api/drilling";

type ScriptLike = DQScript | DrillingScript;

interface ScriptCardProps {
  script: ScriptLike;
  onView: (script: ScriptLike) => void;
  onEdit: (script: ScriptLike) => void;
  onDelete: (id: string) => void;
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

export default function ScriptCard({ script, onView, onEdit, onDelete }: ScriptCardProps) {
  const config = LANGUAGE_CONFIG[script.language] ?? LANGUAGE_CONFIG.python;
  const Icon = config.icon;

  const handleDelete = () => {
    if (confirm(`¿Eliminar el script "${script.name}"?`)) {
      onDelete(script.id);
    }
  };

  return (
    <div className="group rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-slate-300">
      <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${config.gradient} text-white shadow-sm`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${config.badge}`}>
              {config.label}
            </span>
            <button
              onClick={handleDelete}
              className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition"
              title="Eliminar script"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <h3 className="mt-3 text-base font-semibold text-slate-800 line-clamp-1">
          {script.name}
        </h3>
        <p className="mt-1 text-sm text-slate-500 leading-relaxed line-clamp-2 min-h-[40px]">
          {script.description}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => onView(script)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            <Eye className="h-4 w-4" />
            Ver código
          </button>
          <button
            onClick={() => onEdit(script)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-cyan-50 hover:border-cyan-200 hover:text-cyan-700 transition"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}
