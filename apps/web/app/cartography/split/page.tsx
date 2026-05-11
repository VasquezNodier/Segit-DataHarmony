"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Play,
  Loader2,
  AlertCircle,
  HardDrive,
  FolderInput,
  FolderOutput,
  Eye,
  Map as MapIcon,
  Target,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import DirectoryExplorerPanel from "@/components/routines/DirectoryExplorerPanel";
import SplitPreview from "@/components/cartography/SplitPreview";
import { listVolumes, type AppVolume } from "@/lib/api/volumes";
import {
  executeSplit,
  previewSplit,
  type SplitPreviewResponse,
} from "@/lib/api/cartography";
import type { ApiClientOptions } from "@/lib/api/client";

type PathTarget = "source" | "dest";

export default function CartographySplitPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken =
    (session as { accessToken?: string } | null)?.accessToken ?? null;
  const apiOptions: ApiClientOptions = { accessToken };

  const [volumes, setVolumes] = useState<AppVolume[]>([]);
  const [loadingVolumes, setLoadingVolumes] = useState(true);
  const [volumeId, setVolumeId] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [destPath, setDestPath] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [activeTarget, setActiveTarget] = useState<PathTarget>("source");

  const [previewing, setPreviewing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [plan, setPlan] = useState<SplitPreviewResponse | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const prevVolumeRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingVolumes(true);
      try {
        const data = await listVolumes(apiOptions);
        if (!cancelled) {
          setVolumes(data.filter((v) => v.isActive));
        }
      } catch {
        if (!cancelled) setVolumes([]);
      } finally {
        if (!cancelled) setLoadingVolumes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (!volumeId) return;
    if (volumeId !== prevVolumeRef.current) {
      prevVolumeRef.current = volumeId;
      const v = volumes.find((x) => x.id === volumeId);
      if (v) {
        const root = v.sharePath?.trim() || "";
        setSourcePath(root);
        setDestPath(root);
        setPlan(null);
      }
    }
  }, [volumeId, volumes]);

  const canSubmit = Boolean(
    volumeId && sourcePath.trim() && destPath.trim() && !previewing && !executing,
  );
  const hasBlockingConflicts = Boolean(
    plan && plan.conflicts.length > 0 && !overwriteExisting,
  );
  const hasNothingToDo = Boolean(
    plan &&
      plan.summary.newDirsToCreate === 0 &&
      plan.summary.filesToMove === 0 &&
      !plan.summary.ownerDirWillMove,
  );

  const runPreview = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setGlobalError(null);
    setPlan(null);
    if (!canSubmit) return;
    setPreviewing(true);
    try {
      const res = await previewSplit(
        {
          volumeId,
          sourcePath: sourcePath.trim(),
          destPath: destPath.trim(),
        },
        apiOptions,
      );
      setPlan(res);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPreviewing(false);
    }
  };

  const runExecute = async () => {
    setGlobalError(null);
    if (!plan) {
      setGlobalError("Primero genera una previsualización.");
      return;
    }
    if (hasBlockingConflicts) {
      setGlobalError(
        "Existen conflictos sin resolver. Activa sobreescribir o elimina las carpetas destino.",
      );
      return;
    }
    setExecuting(true);
    try {
      const res = await executeSplit(
        {
          volumeId,
          sourcePath: sourcePath.trim(),
          destPath: destPath.trim(),
          overwriteExisting,
        },
        apiOptions,
      );
      router.push(`/jobs/${res.jobId}`);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Unknown error");
      setExecuting(false);
    }
  };

  const explorerPath =
    activeTarget === "source" ? sourcePath.trim() : destPath.trim();
  const onExplorerNavigate = (p: string) => {
    if (activeTarget === "source") setSourcePath(p);
    else setDestPath(p);
    setPlan(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-emerald-600 text-white shadow-sm">
            <MapIcon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <BackButton />
              <h1 className="text-xl font-semibold text-slate-800">
                División por pozo
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              Toma un directorio{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">
                MAPA_LOC_DIST_LINDERO_TRAYECTORIA_&lt;pozo&gt;_&lt;NCR&gt;_MNal
              </code>{" "}
              con archivos PDF/MXD de varios pozos y crea una carpeta por pozo
              ajeno en el destino, moviendo los archivos correspondientes y
              copiando la subcarpeta SHP.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        <form
          onSubmit={runPreview}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Volumen y rutas
              </h2>
              <p className="text-xs text-slate-500">
                Elige el volumen y las rutas fuente/destino (relativas al
                sharePath).
              </p>
            </div>
          </div>

          {globalError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {globalError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Volumen</label>
            {loadingVolumes ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando volúmenes…
              </div>
            ) : volumes.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No hay volúmenes activos. Registra o activa uno en{" "}
                <Link href="/volumes" className="font-medium underline">
                  Volúmenes
                </Link>
                .
              </p>
            ) : (
              <select
                value={volumeId}
                onChange={(e) => {
                  setVolumeId(e.target.value);
                  setPlan(null);
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              >
                <option value="">— Selecciona un volumen —</option>
                {volumes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.volumeType})
                    {v.module ? ` · ${v.module}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FolderInput className="h-4 w-4 text-slate-400" />
              Directorio fuente
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sourcePath}
                onChange={(e) => {
                  setSourcePath(e.target.value);
                  setPlan(null);
                }}
                onFocus={() => setActiveTarget("source")}
                placeholder="/cartografia/MAPA_LOC_DIST_LINDERO_TRAYECTORIA_..."
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-800 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setActiveTarget("source")}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  activeTarget === "source"
                    ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Target className="h-3.5 w-3.5" />
                Explorar
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Carpeta con nombre{" "}
              <code className="font-mono">
                MAPA_LOC_DIST_LINDERO_TRAYECTORIA_&lt;pozo&gt;_&lt;NCR&gt;_MNal
              </code>
              .
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FolderOutput className="h-4 w-4 text-slate-400" />
              Directorio destino
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={destPath}
                onChange={(e) => {
                  setDestPath(e.target.value);
                  setPlan(null);
                }}
                onFocus={() => setActiveTarget("dest")}
                placeholder="/cartografia/output"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setActiveTarget("dest")}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  activeTarget === "dest"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Target className="h-3.5 w-3.5" />
                Explorar
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Donde quedarán las carpetas MAPA por pozo (incl. la del dueño) y los
              ZIPs generados.
            </p>
          </div>

          <p className="text-xs text-slate-500">
            ¿Solo necesitas empaquetar ZIPs?{" "}
            <Link
              href="/cartography/zip"
              className="font-medium text-violet-700 hover:underline"
            >
              Ir a empaquetado ZIP manual
            </Link>
            .
          </p>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3">
            <input
              type="checkbox"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-700">
              Sobreescribir carpetas de destino existentes
            </span>
          </label>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <Link
              href="/cartography"
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-white px-5 py-2.5 text-sm font-semibold text-cyan-700 shadow-sm hover:bg-cyan-50 disabled:opacity-50"
            >
              {previewing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {previewing ? "Analizando…" : "Previsualizar"}
            </button>
            <button
              type="button"
              onClick={runExecute}
              disabled={
                !plan ||
                executing ||
                previewing ||
                hasBlockingConflicts ||
                hasNothingToDo
              }
              className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-cyan-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-cyan-700 hover:to-emerald-700 disabled:opacity-50"
            >
              {executing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {executing ? "Iniciando…" : "Ejecutar división"}
            </button>
          </div>
        </form>

        <div className="min-h-[320px] lg:h-[calc(100vh-260px)] lg:min-h-[480px]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Explorador ·{" "}
              <span
                className={
                  activeTarget === "source" ? "text-cyan-600" : "text-emerald-600"
                }
              >
                {activeTarget === "source" ? "Fuente" : "Destino"}
              </span>
            </p>
            <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTarget("source")}
                className={`rounded px-2 py-1 ${
                  activeTarget === "source"
                    ? "bg-cyan-100 text-cyan-700"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                Fuente
              </button>
              <button
                type="button"
                onClick={() => setActiveTarget("dest")}
                className={`rounded px-2 py-1 ${
                  activeTarget === "dest"
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                Destino
              </button>
            </div>
          </div>
          <DirectoryExplorerPanel
            volumeId={volumeId || null}
            path={explorerPath}
            onNavigateToFolder={onExplorerNavigate}
            apiOptions={apiOptions}
          />
        </div>
      </div>

      {plan && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-cyan-600" />
            <h2 className="text-sm font-semibold text-slate-800">
              Plan propuesto
            </h2>
          </div>
          <SplitPreview plan={plan} />
        </div>
      )}
    </div>
  );
}
