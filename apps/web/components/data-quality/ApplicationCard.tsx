"use client";

import { ExternalLink, Globe, Trash2 } from "lucide-react";
import type { DQApplication } from "@/lib/api/data-quality";
import type { DrillingApplication } from "@/lib/api/drilling";

type ApplicationLike = DQApplication | DrillingApplication;

interface ApplicationCardProps {
  application: ApplicationLike;
  onDelete: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Monitoreo: "bg-cyan-100 text-cyan-700",
  Validación: "bg-violet-100 text-violet-700",
  Documentación: "bg-slate-100 text-slate-700",
  Reportes: "bg-emerald-100 text-emerald-700",
  General: "bg-slate-100 text-slate-600",
};

export default function ApplicationCard({ application, onDelete }: ApplicationCardProps) {
  const badgeColor =
    CATEGORY_COLORS[application.category] ?? "bg-slate-100 text-slate-700";

  const handleDelete = () => {
    if (confirm(`¿Eliminar la aplicación "${application.name}"?`)) {
      onDelete(application.id);
    }
  };

  return (
    <div className="group rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-slate-300">
      <div className="h-1.5 bg-gradient-to-r from-teal-500 to-cyan-600" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm">
            <Globe className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeColor}`}>
              {application.category}
            </span>
            <button
              onClick={handleDelete}
              className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition"
              title="Eliminar aplicación"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <h3 className="mt-3 text-base font-semibold text-slate-800 line-clamp-1">
          {application.name}
        </h3>
        <p className="mt-1 text-sm text-slate-500 leading-relaxed line-clamp-3 min-h-[60px]">
          {application.description}
        </p>

        <a
          href={application.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir aplicación
        </a>
      </div>
    </div>
  );
}
