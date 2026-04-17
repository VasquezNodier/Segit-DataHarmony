"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  Loader2,
  AlertCircle,
  FileText,
  HardDrive,
  FolderInput,
  Filter,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import DirectoryExplorerPanel from "@/components/routines/DirectoryExplorerPanel";
import { getVolumePathConfig } from "@/components/routines/routine-utils";
import { createJob } from "@/lib/api/jobs";
import { listVolumes, type AppVolume } from "@/lib/api/volumes";
import type { GygRoutine } from "@/lib/api/geology-geophysics";
import type { ApiClientOptions } from "@/lib/api/client";

interface Props {
  routine: GygRoutine;
  accessToken: string | null;
}

export default function RoutineVolumePathExecution({
  routine,
  accessToken,
}: Props) {
  const router = useRouter();
  const apiOptions: ApiClientOptions = { accessToken };
  const cfg = getVolumePathConfig(routine.slug);

  const [volumes, setVolumes] = useState<AppVolume[]>([]);
  const [loadingVolumes, setLoadingVolumes] = useState(true);
  const [volumeId, setVolumeId] = useState("");
  const [directoryPath, setDirectoryPath] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
  }, [accessToken]);

  useEffect(() => {
    if (!volumeId) return;
    if (volumeId !== prevVolumeRef.current) {
      prevVolumeRef.current = volumeId;
      const v = volumes.find((x) => x.id === volumeId);
      if (v) {
        // Importante: iniciar siempre dentro del sharePath del volumen.
        // No usar "/" como fallback porque el backend bloquea listar fuera del sharePath.
        setDirectoryPath(v.sharePath?.trim() || "");
      }
    }
  }, [volumeId, volumes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    if (!volumeId) {
      setGlobalError("Select a volume.");
      return;
    }
    const dir = directoryPath.trim();
    if (!dir) {
      setGlobalError("Enter or select a directory path.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("routineId", routine.slug ?? routine.id);
      formData.append("moduleId", "geology_geophysics");
      formData.append("volumeId", volumeId);
      const jobParams: Record<string, unknown> = {
        directoryPath: dir,
        overwriteExisting,
      };
      if (cfg.filter) {
        jobParams[cfg.filter.paramKey] = filterValue.trim();
      }
      formData.append("params", JSON.stringify(jobParams));

      const data = await createJob(formData, apiOptions);
      router.push(`/jobs/${data.id}`);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-teal-600 text-white shadow-sm">
            <Play className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <BackButton />
              <h1 className="text-xl font-semibold text-slate-800">
                {routine.name}
              </h1>
            </div>
            <p className="text-sm text-slate-500">{routine.description}</p>
            <div className="mt-3 flex w-fit items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <code className="text-xs text-slate-600">{routine.script}</code>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Volume & path
              </h2>
              <p className="text-xs text-slate-500">
                Choose where{" "}
                <code className="text-cyan-700">{cfg.inputFilename}</code> lives;
                outputs are written to the same folder.
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
            <label className="text-sm font-medium text-slate-700">Volume</label>
            {loadingVolumes ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading volumes…
              </div>
            ) : volumes.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No active volumes. Register or activate one in{" "}
                <Link href="/volumes" className="font-medium underline">
                  Volumes
                </Link>
                .
              </p>
            ) : (
              <select
                value={volumeId}
                onChange={(e) => setVolumeId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              >
                <option value="">— Select volume —</option>
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
              Working directory path
            </label>
            <input
              type="text"
              value={directoryPath}
              onChange={(e) => setDirectoryPath(e.target.value)}
              placeholder="/project/subfolder"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-800 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <p className="text-xs text-slate-500">
              Type the full path or open folders in the panel → path updates
              automatically.
            </p>
          </div>

          {cfg.filter && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Filter className="h-4 w-4 text-violet-500" />
                {cfg.filter.label}
              </label>
              <input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder={cfg.filter.placeholder}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              {cfg.filter.helperText && (
                <p className="text-xs text-slate-500">{cfg.filter.helperText}</p>
              )}
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3">
            <input
              type="checkbox"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-700">
              Overwrite existing <code className="text-xs">.dat</code> outputs
            </span>
          </label>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <Link
              href="/gyg"
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !volumeId || volumes.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-cyan-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-cyan-700 hover:to-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {submitting ? "Starting…" : "Run routine"}
            </button>
          </div>
        </form>

        <div className="min-h-[320px] lg:h-[calc(100vh-260px)] lg:min-h-[480px]">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Directory explorer
          </p>
          <DirectoryExplorerPanel
            volumeId={volumeId || null}
            path={directoryPath.trim()}
            onNavigateToFolder={(p) => setDirectoryPath(p)}
            apiOptions={apiOptions}
          />
        </div>
      </div>
    </div>
  );
}
