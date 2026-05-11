"use client";

import {
  Folder,
  FolderPlus,
  FileText,
  MapPin,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Info,
  Archive,
} from "lucide-react";
import type { SplitPreviewResponse } from "@/lib/api/cartography";

interface Props {
  plan: SplitPreviewResponse;
}

function formatExt(ext: string): string {
  return `.${ext.toLowerCase()}`;
}

export default function SplitPreview({ plan }: Props) {
  const ownerPlan = plan.detectedWells.find((w) => w.isOwner);
  const othersPlans = plan.detectedWells.filter((w) => !w.isOwner);
  const shpFolderName = plan.shpFolders[0];

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Nuevas carpetas
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">
            {plan.summary.newDirsToCreate}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Archivos a mover
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">
            {plan.summary.filesToMove}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Copias de SHP
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">
            {plan.summary.shpCopiesPlanned}
          </p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-500">
            ZIPs previstos
          </p>
          <p className="mt-1 text-2xl font-semibold text-violet-900">
            {plan.summary.zipsPlanned ?? 0}
          </p>
        </div>
      </div>

      {/* Empaquetado ZIP (fase 2) */}
      <div className="rounded-xl border border-violet-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Archive className="h-4 w-4 text-violet-600" />
          Empaquetado ZIP
        </div>
        {plan.gdbFound ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm">
            <p className="font-medium text-emerald-900">
              GDB detectado:{" "}
              <code className="font-mono text-xs">{plan.gdbFound}</code>
            </p>
            <p className="mt-2 text-xs text-emerald-800">
              Se generará un ZIP por carpeta MAPA (incl. dueño), cada uno con esta
              GDB embebida.
            </p>
            <ul className="mt-2 max-h-40 overflow-y-auto font-mono text-[11px] text-emerald-900">
              {plan.zipsToCreate.map((z) => (
                <li key={z}>{z}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">No se encontró ningún directorio .gdb</p>
                <p className="mt-1 text-xs">
                  No se encontró ningún directorio <code className="font-mono">*.gdb</code>{" "}
                  en el destino. Los ZIPs no se generarán correctamente (error{" "}
                  <code className="font-mono">NO_GDB_FOUND</code> por pozo en la fase
                  ZIP).
                </p>
              </div>
            </div>
          </div>
        )}
        {plan.warnings.length > 0 && plan.gdbFound && (
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            {plan.warnings.map((w) => (
              <li key={w} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Conflicts */}
      {plan.conflicts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Conflictos detectados ({plan.conflicts.length})
          </div>
          <ul className="space-y-1">
            {plan.conflicts.map((c) => (
              <li
                key={c.path}
                className="font-mono text-xs text-red-800"
                title={c.reason}
              >
                <span className="mr-2 rounded bg-red-200 px-1.5 py-0.5 text-red-900">
                  {c.reason}
                </span>
                {c.path}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-red-700">
            Activa &quot;Sobreescribir&quot; para reemplazar estas carpetas, o
            elimínalas manualmente antes de ejecutar.
          </p>
        </div>
      )}

      {/* Owner folder (stays) */}
      {ownerPlan && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
              <CheckCircle2 className="h-3 w-3" />
              Dueño
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {ownerPlan.well}
            </span>
            <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              {ownerPlan.cr}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Folder className="h-4 w-4 text-emerald-600" />
            <code className="font-mono">{ownerPlan.newDirName}</code>
            <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">
              {ownerPlan.willMove
                ? `Se moverá a ${plan.destPath}`
                : "Ya está en la ruta canónica (sin mover carpeta)"}
            </span>
          </div>
          <ul className="mt-2 ml-6 space-y-0.5 border-l border-emerald-200 pl-3 text-xs text-slate-600">
            {ownerPlan.files.map((f) => (
              <li key={f.name} className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono">{f.name}</span>
                <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-500">
                  {formatExt(f.extension)}
                </span>
              </li>
            ))}
            {shpFolderName && (
              <li className="flex items-center gap-2 text-emerald-700">
                <Folder className="h-3.5 w-3.5" />
                <span className="font-mono">{shpFolderName}/</span>
                <span className="rounded bg-emerald-100 px-1 py-0.5 text-[10px]">
                  Viaja con la carpeta MAPA
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* New folders */}
      {othersPlans.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            A crear en <code className="font-mono">{plan.destPath}</code>
          </p>
          {othersPlans.map((w) => (
            <div
              key={`${w.well}-${w.cr}`}
              className="rounded-xl border border-cyan-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  <FolderPlus className="h-3 w-3" />
                  Nuevo
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {w.well}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                  {w.cr}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Folder className="h-4 w-4 text-cyan-600" />
                <code
                  className="truncate font-mono"
                  title={w.targetDirPath}
                >
                  {w.targetDirPath}
                </code>
              </div>
              <ul className="mt-2 ml-6 space-y-0.5 border-l border-cyan-200 pl-3 text-xs text-slate-600">
                {w.files.map((f) => (
                  <li key={f.name} className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-mono">{f.name}</span>
                    <span className="rounded bg-cyan-50 px-1 py-0.5 text-[10px] text-cyan-700">
                      Mover
                    </span>
                  </li>
                ))}
                {shpFolderName && (
                  <li className="flex items-center gap-2 text-violet-700">
                    <Copy className="h-3.5 w-3.5" />
                    <span className="font-mono">{shpFolderName}/</span>
                    <span className="rounded bg-violet-50 px-1 py-0.5 text-[10px]">
                      Copiar desde original
                    </span>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              No hay pozos ajenos al dueño del directorio. No se creará ninguna
              carpeta nueva.
            </p>
          </div>
        </div>
      )}

      {/* Unmatched files */}
      {plan.unmatchedFiles.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Archivos no reconocidos ({plan.unmatchedFiles.length})
          </div>
          <p className="mb-2 text-xs text-amber-800">
            Se quedarán intactos en la carpeta original.
          </p>
          <ul className="space-y-0.5">
            {plan.unmatchedFiles.map((name) => (
              <li
                key={name}
                className="flex items-center gap-2 font-mono text-xs text-amber-900"
              >
                <FileText className="h-3.5 w-3.5 text-amber-600" />
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detected owner info */}
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div>
          <p>
            Pozo dueño detectado:{" "}
            <span className="font-semibold text-slate-800">
              {plan.ownerWell.well}
            </span>{" "}
            <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">
              {plan.ownerWell.cr}
            </span>
          </p>
          <p className="mt-1 text-slate-500">
            Directorio fuente: <code className="font-mono">{plan.sourceDirName}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
