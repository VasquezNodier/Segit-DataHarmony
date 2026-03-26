"use client";

import React, { useState, useMemo } from "react";
import {
  FileCode2,
  Globe,
  BookOpen,
  Database,
  Terminal,
  Search,
  Plus,
  X,
  Loader2,
  LayoutGrid,
  List,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  FileText,
  Upload,
  Paperclip,
  File,
} from "lucide-react";
import ScriptCard from "@/components/data-quality/ScriptCard";
import ApplicationCard from "@/components/data-quality/ApplicationCard";
import DocumentationCard from "@/components/data-quality/DocumentationCard";
import ScriptEditorPanel from "@/components/data-quality/ScriptEditorPanel";
import DocViewerPanel from "@/components/data-quality/DocViewerPanel";
import type {
  DrillingScript,
  DrillingApplication,
  DrillingDocument,
  ScriptLanguage,
  DocType,
} from "@/lib/api/drilling";
import type { ApiClientOptions } from "@/lib/api/client";
import {
  deleteScript,
  deleteApplication,
  deleteDocument,
  createScript,
  createApplication,
  createDocument,
  uploadFile,
  updateScriptContent,
} from "@/lib/api/drilling";

type Tab = "scripts" | "applications" | "documentation";
type LanguageFilter = "all" | "python" | "bash" | "sql";
type ViewMode = "cards" | "list";

interface DrillingTabsProps {
  scripts: DrillingScript[];
  applications: DrillingApplication[];
  documents: DrillingDocument[];
  apiOptions?: ApiClientOptions;
}

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "scripts", label: "Scripts", icon: FileCode2 },
  { id: "applications", label: "Aplicaciones", icon: Globe },
  { id: "documentation", label: "Documentación", icon: BookOpen },
];

const SCRIPT_LANGUAGE_FILTERS: { id: LanguageFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "python", label: "Python" },
  { id: "bash", label: "Bash" },
  { id: "sql", label: "SQL" },
];

const APP_CATEGORIES = ["General", "Monitoreo", "Validación", "Reportes", "Documentación"];

// ─── ViewToggle ───────────────────────────────────────────────────────────────

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
      <button
        onClick={() => onChange("cards")}
        title="Vista de cards"
        className={`flex items-center justify-center rounded-md p-1.5 transition ${
          value === "cards"
            ? "bg-slate-800 text-white"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange("list")}
        title="Vista de lista"
        className={`flex items-center justify-center rounded-md p-1.5 transition ${
          value === "list"
            ? "bg-slate-800 text-white"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DrillingTabs({
  scripts: initialScripts,
  applications: initialApplications,
  documents: initialDocuments,
  apiOptions = {},
}: DrillingTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("scripts");

  // Local state for optimistic updates
  const [scripts, setScripts] = useState<DrillingScript[]>(initialScripts);
  const [applications, setApplications] = useState<DrillingApplication[]>(initialApplications);
  const [documents, setDocuments] = useState<DrillingDocument[]>(initialDocuments);

  // View mode (cards / list) — shared across tabs
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Search state per tab
  const [scriptQuery, setScriptQuery] = useState("");
  const [appQuery, setAppQuery] = useState("");
  const [docQuery, setDocQuery] = useState("");

  // Language filter for scripts
  const [langFilter, setLangFilter] = useState<LanguageFilter>("all");

  // Side panel state — scripts
  const [panelScript, setPanelScript] = useState<DrillingScript | null>(null);
  const [panelEditMode, setPanelEditMode] = useState(false);

  // Side panel state — documents
  const [panelDoc, setPanelDoc] = useState<DrillingDocument | null>(null);

  // New-item modal state
  const [showNewScript, setShowNewScript] = useState(false);
  const [showNewApp, setShowNewApp] = useState(false);
  const [showNewDoc, setShowNewDoc] = useState(false);

  // ── Filtered lists ──────────────────────────────────────────────────────────

  const filteredScripts = useMemo(() => {
    return scripts.filter((s) => {
      const matchesLang = langFilter === "all" || s.language === langFilter;
      const q = scriptQuery.toLowerCase();
      const matchesQuery =
        !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      return matchesLang && matchesQuery;
    });
  }, [scripts, langFilter, scriptQuery]);

  const filteredApps = useMemo(() => {
    const q = appQuery.toLowerCase();
    return !q
      ? applications
      : applications.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q)
        );
  }, [applications, appQuery]);

  const filteredDocs = useMemo(() => {
    const q = docQuery.toLowerCase();
    return !q
      ? documents
      : documents.filter(
          (d) =>
            d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
        );
  }, [documents, docQuery]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDeleteScript = async (id: string) => {
    await deleteScript(id, apiOptions);
    setScripts((prev) => prev.filter((s) => s.id !== id));
    if (panelScript?.id === id) setPanelScript(null);
  };

  const handleDeleteApp = async (id: string) => {
    await deleteApplication(id, apiOptions);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDeleteDoc = async (id: string) => {
    await deleteDocument(id, apiOptions);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (panelDoc?.id === id) setPanelDoc(null);
  };

  const handleScriptSaved = (id: string, newContent: string) => {
    setScripts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, content: newContent } : s))
    );
    // Update panel script too
    setPanelScript((prev) => (prev?.id === id ? { ...prev, content: newContent } : prev));
  };

  const handleAddScript = (script: DrillingScript) => {
    setScripts((prev) => [...prev, script]);
    setShowNewScript(false);
  };

  const handleAddApp = (app: DrillingApplication) => {
    setApplications((prev) => [...prev, app]);
    setShowNewApp(false);
  };

  const handleAddDoc = (doc: DrillingDocument) => {
    setDocuments((prev) => [...prev, doc]);
    setShowNewDoc(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Tab navigation */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count =
            tab.id === "scripts"
              ? scripts.length
              : tab.id === "applications"
              ? applications.length
              : documents.length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isActive ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Scripts tab ──────────────────────────────────────────────────────── */}
      {activeTab === "scripts" && (
        <div className="space-y-4">
          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={scriptQuery}
                onChange={(e) => setScriptQuery(e.target.value)}
                placeholder="Buscar script…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
              />
              {scriptQuery && (
                <button
                  onClick={() => setScriptQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Language filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {SCRIPT_LANGUAGE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setLangFilter(f.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    langFilter === f.id
                      ? "bg-slate-800 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                  {f.id !== "all" && (
                    <span className="ml-1 opacity-60">
                      ({scripts.filter((s) => s.language === f.id).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* View toggle + Add button */}
            <div className="flex items-center gap-2">
              <ViewToggle value={viewMode} onChange={setViewMode} />
              <button
                onClick={() => setShowNewScript(true)}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Nuevo script
              </button>
            </div>
          </div>

          {filteredScripts.length === 0 ? (
            <EmptyState
              icon={FileCode2}
              title="No hay scripts"
              description={
                scriptQuery || langFilter !== "all"
                  ? "Ningún script coincide con el filtro actual."
                  : "Agrega tu primer script con el botón \"Nuevo script\"."
              }
            />
          ) : viewMode === "cards" ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredScripts.map((script) => (
                <ScriptCard
                  key={script.id}
                  script={script}
                  onView={(s) => { setPanelScript(s); setPanelEditMode(false); }}
                  onEdit={(s) => { setPanelScript(s); setPanelEditMode(true); }}
                  onDelete={handleDeleteScript}
                />
              ))}
            </div>
          ) : (
            <ScriptListView
              scripts={filteredScripts}
              onView={(s) => { setPanelScript(s); setPanelEditMode(false); }}
              onEdit={(s) => { setPanelScript(s); setPanelEditMode(true); }}
              onDelete={handleDeleteScript}
            />
          )}
        </div>
      )}

      {/* ── Applications tab ─────────────────────────────────────────────────── */}
      {activeTab === "applications" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={appQuery}
                onChange={(e) => setAppQuery(e.target.value)}
                placeholder="Buscar aplicación…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
              />
              {appQuery && (
                <button onClick={() => setAppQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <ViewToggle value={viewMode} onChange={setViewMode} />
            <button
              onClick={() => setShowNewApp(true)}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Nueva app
            </button>
          </div>

          {filteredApps.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No hay aplicaciones"
              description={
                appQuery
                  ? "Ninguna aplicación coincide con la búsqueda."
                  : "Agrega tu primera aplicación con el botón \"Nueva app\"."
              }
            />
          ) : viewMode === "cards" ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredApps.map((app) => (
                <ApplicationCard key={app.id} application={app} onDelete={handleDeleteApp} />
              ))}
            </div>
          ) : (
            <AppListView apps={filteredApps} onDelete={handleDeleteApp} />
          )}
        </div>
      )}

      {/* ── Documentation tab ────────────────────────────────────────────────── */}
      {activeTab === "documentation" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={docQuery}
                onChange={(e) => setDocQuery(e.target.value)}
                placeholder="Buscar documento…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
              />
              {docQuery && (
                <button onClick={() => setDocQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <ViewToggle value={viewMode} onChange={setViewMode} />
            <button
              onClick={() => setShowNewDoc(true)}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Nuevo documento
            </button>
          </div>

          {filteredDocs.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No hay documentación"
              description={
                docQuery
                  ? "Ningún documento coincide con la búsqueda."
                  : "Agrega tu primer documento con el botón \"Nuevo documento\"."
              }
            />
          ) : viewMode === "cards" ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocs.map((doc) => (
                <DocumentationCard
                  key={doc.id}
                  document={doc}
                  onDelete={handleDeleteDoc}
                  onViewFile={(d) => setPanelDoc(d)}
                />
              ))}
            </div>
          ) : (
            <DocListView docs={filteredDocs} onDelete={handleDeleteDoc} onViewFile={(d) => setPanelDoc(d)} />
          )}
        </div>
      )}

      {/* ── Script Editor Side Panel ─────────────────────────────────────────── */}
      {panelScript && (
        <ScriptEditorPanel
          script={panelScript}
          initialEditMode={panelEditMode}
          onClose={() => setPanelScript(null)}
          onSaved={handleScriptSaved}
          apiOptions={apiOptions}
          updateScriptContent={updateScriptContent}
        />
      )}

      {/* ── Document Viewer Side Panel ────────────────────────────────────────── */}
      {panelDoc && (
        <DocViewerPanel
          doc={panelDoc}
          onClose={() => setPanelDoc(null)}
          filesRoutePrefix="drilling"
        />
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showNewScript && (
        <NewScriptModal
          onClose={() => setShowNewScript(false)}
          onCreated={handleAddScript}
          apiOptions={apiOptions}
        />
      )}
      {showNewApp && (
        <NewAppModal
          categories={APP_CATEGORIES}
          onClose={() => setShowNewApp(false)}
          onCreated={handleAddApp}
          apiOptions={apiOptions}
        />
      )}
      {showNewDoc && (
        <NewDocModal
          onClose={() => setShowNewDoc(false)}
          onCreated={handleAddDoc}
          apiOptions={apiOptions}
        />
      )}
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-700">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 text-center max-w-xs px-4">{description}</p>
    </div>
  );
}

// ─── List view components ─────────────────────────────────────────────────────

const LANG_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  python: { label: "Python", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  bash:   { label: "Bash",   badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  sql:    { label: "SQL",    badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
};

function ScriptListView({
  scripts,
  onView,
  onEdit,
  onDelete,
}: {
  scripts: DrillingScript[];
  onView: (s: DrillingScript) => void;
  onEdit: (s: DrillingScript) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Lenguaje
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nombre
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">
              Descripción
            </th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {scripts.map((script) => {
            const cfg = LANG_CONFIG[script.language] ?? LANG_CONFIG.python;
            return (
              <tr key={script.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm font-medium text-slate-800">
                  {script.name}
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-500 hidden md:table-cell max-w-xs truncate">
                  {script.description}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(script)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                      title="Ver código"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(script)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600 transition"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`¿Eliminar "${script.name}"?`)) onDelete(script.id); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const APP_CATEGORY_COLORS: Record<string, string> = {
  Monitoreo: "bg-cyan-100 text-cyan-700",
  Validación: "bg-violet-100 text-violet-700",
  Documentación: "bg-slate-100 text-slate-700",
  Reportes: "bg-emerald-100 text-emerald-700",
  General: "bg-slate-100 text-slate-600",
};

function AppListView({
  apps,
  onDelete,
}: {
  apps: DrillingApplication[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nombre
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">
              Categoría
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
              Descripción
            </th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {apps.map((app) => {
            const color = APP_CATEGORY_COLORS[app.category] ?? "bg-slate-100 text-slate-600";
            return (
              <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-slate-800">
                  {app.name}
                </td>
                <td className="px-5 py-3.5 hidden sm:table-cell">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${color}`}>
                    {app.category}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-500 hidden lg:table-cell max-w-xs truncate">
                  {app.description}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                      title="Abrir aplicación"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => { if (confirm(`¿Eliminar "${app.name}"?`)) onDelete(app.id); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DocListView({
  docs,
  onDelete,
  onViewFile,
}: {
  docs: DrillingDocument[];
  onDelete: (id: string) => void;
  onViewFile?: (doc: DrillingDocument) => void;
}) {
  const [openDoc, setOpenDoc] = useState<DrillingDocument | null>(null);

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tipo
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Título
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">
                Descripción
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  {doc.type === "markdown" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                      <FileText className="h-3 w-3" />
                      Markdown
                    </span>
                  ) : doc.type === "file" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                      <Paperclip className="h-3 w-3" />
                      {doc.fileName ? (doc.fileName.split(".").pop() ?? "Archivo").toUpperCase() : "Archivo"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      <ExternalLink className="h-3 w-3" />
                      Enlace
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-sm font-medium text-slate-800">
                  {doc.title}
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-500 hidden md:table-cell max-w-xs truncate">
                  {doc.description}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {doc.type === "markdown" && (
                      <button
                        onClick={() => setOpenDoc(doc)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600 transition"
                        title="Ver documento"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {doc.type === "file" && (
                      <button
                        onClick={() => onViewFile?.(doc)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition"
                        title="Ver archivo"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {doc.type === "link" && doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title="Abrir enlace"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => { if (confirm(`¿Eliminar "${doc.title}"?`)) onDelete(doc.id); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Markdown viewer from list */}
      {openDoc && (
        <DocMarkdownModal doc={openDoc} onClose={() => setOpenDoc(null)} />
      )}
    </>
  );
}

function DocMarkdownModal({ doc, onClose }: { doc: DrillingDocument; onClose: () => void }) {
  // We delegate to the DocumentationCard modal by duplicating the minimal structure
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-12 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">{doc.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh] text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
          {doc.content}
        </div>
      </div>
    </div>
  );
}

// ── New Script Modal ──────────────────────────────────────────────────────────

const SCRIPT_LANG_EXT: Record<string, ScriptLanguage> = {
  py: "python",
  python: "python",
  sh: "bash",
  bash: "bash",
  sql: "sql",
};

function NewScriptModal({
  onClose,
  onCreated,
  apiOptions = {},
}: {
  onClose: () => void;
  onCreated: (s: DrillingScript) => void;
  apiOptions?: ApiClientOptions;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<ScriptLanguage>("python");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const detectedLang = SCRIPT_LANG_EXT[ext];
    if (detectedLang) setLanguage(detectedLang);
    if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (ev) => setContent((ev.target?.result as string) ?? "");
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es obligatorio."); return; }
    setSaving(true);
    setError("");
    try {
      const script = await createScript(
        { name, description, language, content },
        apiOptions
      );
      onCreated(script);
    } catch {
      setError("No se pudo crear el script. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const LANG_ICONS: Record<ScriptLanguage, React.ComponentType<{ className?: string }>> = {
    python: FileCode2,
    bash: Terminal,
    sql: Database,
  };

  return (
    <ModalWrapper title="Nuevo Script" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Import from file */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-slate-600">Importar desde archivo</p>
            <p className="text-[11px] text-slate-400">.py · .sh · .sql · .txt</p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            <Upload className="h-3.5 w-3.5" />
            Importar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".py,.sh,.bash,.sql,.txt"
            className="hidden"
            onChange={handleFileImport}
          />
        </div>

        <Field label="Nombre *">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mi script de validación"
            className={inputCls(!!error && !name.trim())}
          />
        </Field>

        <Field label="Descripción">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción breve del script"
            className={inputCls(false)}
          />
        </Field>

        <Field label="Lenguaje *">
          <div className="flex gap-2">
            {(["python", "bash", "sql"] as ScriptLanguage[]).map((lang) => {
              const LangIcon = LANG_ICONS[lang];
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition ${
                    language === lang
                      ? "border-cyan-400 bg-cyan-50 text-cyan-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <LangIcon className="h-4 w-4" />
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Código">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder={language === "python" ? "# Tu código Python aquí" : language === "sql" ? "SELECT ..." : "#!/bin/bash"}
            className="w-full rounded-lg border border-slate-200 bg-slate-900 px-3 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
          />
        </Field>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <ModalActions onClose={onClose} saving={saving} submitLabel="Crear script" />
      </form>
    </ModalWrapper>
  );
}

// ── New App Modal ─────────────────────────────────────────────────────────────

function NewAppModal({
  categories,
  onClose,
  onCreated,
  apiOptions = {},
}: {
  categories: string[];
  onClose: () => void;
  onCreated: (a: DrillingApplication) => void;
  apiOptions?: ApiClientOptions;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("General");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) { setError("El nombre y la URL son obligatorios."); return; }
    setSaving(true);
    setError("");
    try {
      const app = await createApplication(
        { name, description, url, category },
        apiOptions
      );
      onCreated(app);
    } catch {
      setError("No se pudo crear la aplicación. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Nueva Aplicación" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre *">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi dashboard" className={inputCls(false)} />
        </Field>
        <Field label="URL *">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." type="url" className={inputCls(false)} />
        </Field>
        <Field label="Descripción">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción de la aplicación" className={inputCls(false)} />
        </Field>
        <Field label="Categoría">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls(false)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <ModalActions onClose={onClose} saving={saving} submitLabel="Agregar aplicación" />
      </form>
    </ModalWrapper>
  );
}

// ── New Doc Modal ─────────────────────────────────────────────────────────────

const DOC_TYPES: { id: DocType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "link", label: "Enlace externo", icon: ExternalLink },
  { id: "markdown", label: "Markdown", icon: FileText },
  { id: "file", label: "Archivo", icon: Paperclip },
];

function NewDocModal({
  onClose,
  onCreated,
  apiOptions = {},
}: {
  onClose: () => void;
  onCreated: (d: DrillingDocument) => void;
  apiOptions?: ApiClientOptions;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<DocType>("link");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUploadProgress("idle");
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("El título es obligatorio."); return; }
    if (type === "link" && !url.trim()) { setError("La URL es obligatoria."); return; }
    if (type === "file" && !selectedFile) { setError("Selecciona un archivo."); return; }

    setSaving(true);
    setError("");

    try {
      let fileId: string | undefined;
      let fileName: string | undefined;
      let mimeType: string | undefined;
      let fileSize: number | undefined;

      // Upload file first if needed
      if (type === "file" && selectedFile) {
        setUploadProgress("uploading");
        const uploadData = await uploadFile(selectedFile, apiOptions);
        fileId = uploadData.fileId;
        fileName = uploadData.fileName;
        mimeType = uploadData.mimeType;
        fileSize = uploadData.fileSize;
        setUploadProgress("done");
      }

      const doc = await createDocument(
        {
          title,
          description,
          type,
          url: type === "link" ? url : undefined,
          content: type === "markdown" ? content : undefined,
          file_id: fileId,
          file_name: fileName,
          mime_type: mimeType,
          file_size: fileSize,
        },
        apiOptions
      );
      onCreated(doc);
    } catch {
      setUploadProgress("error");
      setError("No se pudo crear el documento. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Nuevo Documento" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Título *">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Guía de Drilling" className={inputCls(false)} />
        </Field>
        <Field label="Descripción">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción breve del documento" className={inputCls(false)} />
        </Field>
        <Field label="Tipo">
          <div className="flex gap-2">
            {DOC_TYPES.map(({ id: t, label, icon: Icon }) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium transition ${
                  type === t
                    ? "border-cyan-400 bg-cyan-50 text-cyan-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </Field>

        {type === "link" && (
          <Field label="URL *">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." type="url" className={inputCls(false)} />
          </Field>
        )}

        {type === "markdown" && (
          <Field label="Contenido Markdown">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder={"# Título\n\nEscribe tu documentación aquí..."}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none"
            />
          </Field>
        )}

        {type === "file" && (
          <Field label="Archivo *">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center hover:border-cyan-400 hover:bg-cyan-50/40 transition"
            >
              {selectedFile ? (
                <>
                  <File className="h-7 w-7 text-cyan-500" />
                  <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB · Click para cambiar
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-slate-400" />
                  <p className="text-sm font-medium text-slate-600">Haz click para seleccionar un archivo</p>
                  <p className="text-xs text-slate-400">PDF, DOCX, XLSX, PPTX, TXT y más</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
            {uploadProgress === "uploading" && (
              <p className="mt-1 flex items-center gap-1 text-xs text-cyan-600">
                <Loader2 className="h-3 w-3 animate-spin" /> Subiendo archivo…
              </p>
            )}
          </Field>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
        <ModalActions onClose={onClose} saving={saving} submitLabel="Crear documento" />
      </form>
    </ModalWrapper>
  );
}

// ── Shared modal helpers ───────────────────────────────────────────────────────

function ModalWrapper({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({
  onClose,
  saving,
  submitLabel,
}: {
  onClose: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 transition disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 transition ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-400"
      : "border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
  }`;
}

