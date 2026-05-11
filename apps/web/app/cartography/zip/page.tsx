"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Archive,
  AlertCircle,
  Eye,
  FolderOutput,
  HardDrive,
  Loader2,
  Map as MapIcon,
  Play,
  Target,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import DirectoryExplorerPanel from "@/components/routines/DirectoryExplorerPanel";
import type { FileEntry } from "@/lib/api/volumes";
import {
  executeZipPack,
  previewZipPack,
  type ZipPackPreviewResponse,
} from "@/lib/api/cartography";
import { listVolumes, type AppVolume } from "@/lib/api/volumes";
import type { ApiClientOptions } from "@/lib/api/client";

function parentDir(p: string): string {
  const t = p.replace(/\/+$/, "");
  const i = t.lastIndexOf("/");
  if (i <= 0) return "/";
  return t.slice(0, i) || "/";
}

function mapaFolderSelectable(e: FileEntry): boolean {
  return (
    e.type === "folder" &&
    e.name.startsWith("MAPA_") &&
    !e.name.toLowerCase().endsWith(".gdb")
  );
}

type ExplorerTab = "mapa" | "gdb";

export default function CartographyZipPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken =
    (session as { accessToken?: string } | null)?.accessToken ?? null;
  const apiOptions: ApiClientOptions = { accessToken };

  const [volumes, setVolumes] = useState<AppVolume[]>([]);
  const [loadingVolumes, setLoadingVolumes] = useState(true);
  const [volumeId, setVolumeId] = useState("");
  const [destPath, setDestPath] = useState("");
  const [gdbPath, setGdbPath] = useState("");
  const [dirsToZip, setDirsToZip] = useState<string[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [explorerTab, setExplorerTab] = useState<ExplorerTab>("mapa");
  const [explorerPath, setExplorerPath] = useState("");

  const [previewing, setPreviewing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [zipPlan, setZipPlan] = useState<ZipPackPreviewResponse | null>(null);
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
        setDestPath(root);
        setGdbPath("");
        setDirsToZip([]);
        setExplorerPath(root);
        setZipPlan(null);
      }
    }
  }, [volumeId, volumes]);

  const toggleDir = (path: string) => {
    setDirsToZip((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
    setZipPlan(null);
    setDestPath((d) => {
      if (!d.trim()) return parentDir(path);
      return d;
    });
  };

  const onPickGdb = (path: string) => {
    setGdbPath(path);
    setZipPlan(null);
  };

  const canSubmit = Boolean(
    volumeId &&
      destPath.trim() &&
      gdbPath.trim() &&
      dirsToZip.length > 0 &&
      !previewing &&
      !executing,
  );

  const hasBlockingConflicts = Boolean(
    zipPlan && zipPlan.conflicts.length > 0 && !overwriteExisting,
  );

  const runPreview = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setGlobalError(null);
    setZipPlan(null);
    if (!canSubmit) return;
    setPreviewing(true);
    try {
      const res = await previewZipPack(
        {
          volumeId,
          destPath: destPath.trim(),
          gdbPath: gdbPath.trim(),
          dirsToZip: dirsToZip,
        },
        apiOptions,
      );
      setZipPlan(res);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPreviewing(false);
    }
  };

  const runExecute = async () => {
    setGlobalError(null);
    if (!zipPlan) {
      setGlobalError("Primero genera una previsualización.");
      return;
    }
    if (hasBlockingConflicts) {
      setGlobalError(
        "Hay ZIPs ya existentes. Activa sobreescribir o elimínalos antes de ejecutar.",
      );
      return;
    }
    setExecuting(true);
    try {
      const res = await executeZipPack(
        {
          volumeId,
          destPath: destPath.trim(),
          gdbPath: gdbPath.trim(),
          dirsToZip: dirsToZip,
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

  const onExplorerNavigate = (p: string) => {
    setExplorerPath(p);
    setZipPlan(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-cyan-600 text-white shadow-sm">
            <Archive className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <BackButton />
              <h1 className="text-xl font-semibold text-slate-800">
                Empaquetado ZIP (MAPA + GDB)
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              Selecciona varias carpetas{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">
                MAPA_*
              </code>{" "}
              y un directorio{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">
                *.gdb
              </code>
              . Se creará un ZIP por carpeta MAPA bajo el destino indicado.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        <form
          onSubmit={runPreview}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Volumen y rutas
              </h2>
              <p className="text-xs text-slate-500">
                El ZIP se escribe en <code className="font-mono">destPath</code>.
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
                No hay volúmenes activos.
              </p>
            ) : (
              <select
                value={volumeId}
                onChange={(e) => {
                  setVolumeId(e.target.value);
                  setZipPlan(null);
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                required
              >
                <option value="">— Selecciona un volumen —</option>
                {volumes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.volumeType})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FolderOutput className="h-4 w-4 text-slate-400" />
              Directorio destino (donde están los MAPA y salen los .zip)
            </label>
            <input
              type="text"
              value={destPath}
              onChange={(e) => {
                setDestPath(e.target.value);
                setZipPlan(null);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="/cartografia/output"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              GDB seleccionada (ruta completa)
            </label>
            <input
              type="text"
              value={gdbPath}
              onChange={(e) => {
                setGdbPath(e.target.value);
                setZipPlan(null);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="/cartografia/output/Base_Rubiales.gdb"
            />
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700">
              Carpetas MAPA seleccionadas ({dirsToZip.length})
            </p>
            {dirsToZip.length === 0 ? (
              <p className="mt-1 text-slate-500">Ninguna — usa el explorador (modo MAPA).</p>
            ) : (
              <ul className="mt-1 max-h-28 space-y-0.5 overflow-y-auto font-mono text-[11px]">
                {dirsToZip.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3">
            <input
              type="checkbox"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-slate-700">
              Sobreescribir ZIPs ya existentes en destino
            </span>
          </label>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <Link
              href="/cartography"
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Volver
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50 disabled:opacity-50"
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
              disabled={!zipPlan || executing || previewing || hasBlockingConflicts}
              className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-violet-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-violet-700 hover:to-cyan-700 disabled:opacity-50"
            >
              {executing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {executing ? "Iniciando…" : "Ejecutar ZIPs"}
            </button>
          </div>
        </form>

        <div className="min-h-[320px] lg:h-[calc(100vh-260px)] lg:min-h-[480px]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Explorador
            </p>
            <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setExplorerTab("mapa")}
                className={`rounded px-2 py-1 ${
                  explorerTab === "mapa"
                    ? "bg-violet-100 text-violet-800"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                MAPA (multi)
              </button>
              <button
                type="button"
                onClick={() => setExplorerTab("gdb")}
                className={`rounded px-2 py-1 ${
                  explorerTab === "gdb"
                    ? "bg-cyan-100 text-cyan-800"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                GDB
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setExplorerPath(destPath.trim() || explorerPath);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <Target className="h-3.5 w-3.5" />
              Ir a destino
            </button>
          </div>
          <DirectoryExplorerPanel
            volumeId={volumeId || null}
            path={explorerPath}
            onNavigateToFolder={onExplorerNavigate}
            apiOptions={apiOptions}
            mode={explorerTab === "mapa" ? "multiFolder" : "pickGdb"}
            selectedFolderPaths={dirsToZip}
            onToggleFolderSelect={toggleDir}
            onPickGdbFolder={onPickGdb}
            folderSelectableFilter={
              explorerTab === "mapa" ? mapaFolderSelectable : undefined
            }
          />
        </div>
      </div>

      {zipPlan && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Archive className="h-5 w-5 text-violet-600" />
            <h2 className="text-sm font-semibold text-slate-800">Plan ZIP</h2>
          </div>
          {zipPlan.conflicts.length > 0 && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <p className="font-semibold">Conflictos</p>
              <ul className="mt-1 font-mono">
                {zipPlan.conflicts.map((c) => (
                  <li key={c.path}>{c.path}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-slate-600">
            GDB: <code className="font-mono">{zipPlan.gdbFound}</code>
          </p>
          <ul className="mt-2 max-h-48 overflow-y-auto font-mono text-xs text-slate-700">
            {zipPlan.zipsToCreate.map((z) => (
              <li key={z}>{z}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
