"use client";

import Link from "next/link";
import { ExternalLink, Globe, Monitor, Pencil, Trash2 } from "lucide-react";
import type { DrillingApplication } from "@/lib/api/drilling";

interface DrillingApplicationCardProps {
  application: DrillingApplication;
  onEdit: (app: DrillingApplication) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Monitoreo: "bg-cyan-100 text-cyan-700",
  Validación: "bg-violet-100 text-violet-700",
  Documentación: "bg-slate-100 text-slate-700",
  Reportes: "bg-emerald-100 text-emerald-700",
  General: "bg-slate-100 text-slate-600",
};

export default function DrillingApplicationCard({
  application,
  onEdit,
  onDelete,
}: DrillingApplicationCardProps) {
  const badgeColor =
    CATEGORY_COLORS[application.category] ?? "bg-slate-100 text-slate-700";

  const handleDelete = () => {
    if (confirm(`¿Eliminar la aplicación "${application.name}"?`)) {
      onDelete(application.id);
    }
  };

  return (
    <div className="group rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-slate-300">
      <div className="h-1.5 bg-linear-to-r from-teal-500 to-cyan-600" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-teal-500 to-cyan-600 text-white shadow-sm">
            <Globe className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeColor}`}
            >
              {application.category}
            </span>
            <button
              type="button"
              onClick={() => onEdit(application)}
              className="rounded-lg p-1 text-slate-300 hover:bg-cyan-50 hover:text-cyan-600 transition"
              title="Editar aplicación"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
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

        <div className="mt-4 grid gap-2">
          <Link
            href={`/drilling/app-viewer/${application.id}`}
            className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            <Monitor className="h-4 w-4" />
            Abrir en portal
          </Link>
          <a
            href={application.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir en nueva pestaña
          </a>
        </div>
      </div>
    </div>
  );
}

