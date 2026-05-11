"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Folder,
  File,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  listDirectory,
  type FileEntry,
  type ApiClientOptions,
} from "@/lib/api/volumes";

const rowCls =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100";
const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

export type ExplorerMode = "browse" | "multiFolder" | "pickGdb";

interface Props {
  volumeId: string | null;
  path: string;
  onNavigateToFolder: (newPath: string) => void;
  apiOptions: ApiClientOptions;
  /** browse: solo navegación. multiFolder: checkbox por carpeta. pickGdb: clic en *.gdb elige ruta. */
  mode?: ExplorerMode;
  selectedFolderPaths?: string[];
  onToggleFolderSelect?: (folderPath: string) => void;
  onPickGdbFolder?: (folderPath: string) => void;
  /** Si devuelve false, la carpeta no es seleccionable (solo modo multiFolder). */
  folderSelectableFilter?: (entry: FileEntry) => boolean;
}

export default function DirectoryExplorerPanel({
  volumeId,
  path,
  onNavigateToFolder,
  apiOptions,
  mode = "browse",
  selectedFolderPaths = [],
  onToggleFolderSelect,
  onPickGdbFolder,
  folderSelectableFilter,
}: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery("");
  }, [volumeId]);

  const load = useCallback(async () => {
    const p = path.trim();
    if (!volumeId) {
      setEntries([]);
      setError(null);
      return;
    }
    if (!p) {
      setEntries([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listDirectory(volumeId, p, apiOptions);
      const folders = res.entries.filter((e) => e.type === "folder");
      const files = res.entries.filter((e) => e.type === "file");
      folders.sort((a, b) => a.name.localeCompare(b.name));
      files.sort((a, b) => a.name.localeCompare(b.name));
      setEntries([...folders, ...files]);
    } catch (e) {
      setEntries([]);
      setError(e instanceof Error ? e.message : "Could not list directory");
    } finally {
      setLoading(false);
    }
  }, [volumeId, path, apiOptions]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedSet = new Set(selectedFolderPaths);

  if (!volumeId) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
        <Folder className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">
          Select a volume to browse directories
        </p>
      </div>
    );
  }

  if (!path.trim()) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
        <Folder className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">
          Loading volume root…
        </p>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filteredEntries = q
    ? entries.filter((e) => e.name.toLowerCase().includes(q))
    : entries;

  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Current path
            </p>
            <p
              className="mt-0.5 truncate font-mono text-xs text-slate-700"
              title={path}
            >
              {path || "/"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search folders/files…"
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>
        {mode === "multiFolder" && (
          <p className="mt-2 text-[11px] text-slate-500">
            Marca las carpetas MAPA a incluir en el ZIP. Usa la flecha para entrar
            en una carpeta.
          </p>
        )}
        {mode === "pickGdb" && (
          <p className="mt-2 text-[11px] text-slate-500">
            Haz clic en un directorio <code className="font-mono">*.gdb</code>{" "}
            para seleccionarlo.
          </p>
        )}
      </div>

      {error && (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {loading && filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            <p className="mt-2 text-sm">Loading…</p>
          </div>
        ) : filteredEntries.length === 0 && !error ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {q ? "No matches" : "Empty directory"}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filteredEntries.map((e) => (
              <li key={e.path}>
                {e.type === "folder" ? (
                  <div
                    className={`${rowCls} ${
                      mode === "pickGdb" &&
                      !e.name.toLowerCase().endsWith(".gdb")
                        ? ""
                        : ""
                    }`}
                  >
                    {mode === "multiFolder" && (
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-cyan-600"
                        checked={selectedSet.has(e.path)}
                        disabled={
                          folderSelectableFilter
                            ? !folderSelectableFilter(e)
                            : false
                        }
                        onChange={() => onToggleFolderSelect?.(e.path)}
                        title="Seleccionar carpeta"
                      />
                    )}
                    <button
                      type="button"
                      className={`flex min-w-0 flex-1 items-center gap-2 text-left ${
                        mode === "multiFolder" &&
                        folderSelectableFilter &&
                        !folderSelectableFilter(e)
                          ? "opacity-40"
                          : ""
                      }`}
                      onClick={() => {
                        if (mode === "pickGdb") {
                          if (e.name.toLowerCase().endsWith(".gdb")) {
                            onPickGdbFolder?.(e.path);
                          } else {
                            setQuery("");
                            onNavigateToFolder(e.path);
                          }
                          return;
                        }
                        setQuery("");
                        onNavigateToFolder(e.path);
                      }}
                    >
                      <Folder className="h-4 w-4 shrink-0 text-violet-500" />
                      <span className="flex-1 truncate text-slate-800">
                        {e.name}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Entrar en carpeta"
                      onClick={() => {
                        setQuery("");
                        onNavigateToFolder(e.path);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className={`${rowCls} cursor-default text-slate-600`}>
                    <File className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="flex-1 truncate">{e.name}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
