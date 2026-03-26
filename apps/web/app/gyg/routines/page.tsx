"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2, FolderOpen, ArrowLeft } from "lucide-react";
import BackButton from "@/components/BackButton";
import { listRoutines, type GygRoutine } from "@/lib/api/geology-geophysics";
import RoutineCard from "@/components/routines/RoutineCard";
import RoutineListView from "@/components/routines/RoutineListView";
import RoutinesFilters, {
  type RoutinesFilterValue,
  type RoutinesViewMode,
} from "@/components/routines/RoutinesFilters";

const DEFAULT_FILTER: RoutinesFilterValue = {
  query: "",
  executionProfile: "all",
  needsDatasource: "all",
};

function filterRoutines(
  routines: GygRoutine[],
  filter: RoutinesFilterValue
): GygRoutine[] {
  return routines.filter((r) => {
    const q = filter.query.toLowerCase().trim();
    if (q) {
      const matchesQuery =
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.script.toLowerCase().includes(q);
      if (!matchesQuery) return false;
    }

    if (filter.executionProfile !== "all") {
      const profile = r.executionProfile ?? "default";
      if (profile !== filter.executionProfile) return false;
    }

    if (filter.needsDatasource !== "all") {
      const needs = r.needsDatasource;
      if (filter.needsDatasource === "yes" && !needs) return false;
      if (filter.needsDatasource === "no" && needs) return false;
    }

    return true;
  });
}

export default function GygRoutinesPage() {
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? null;
  const apiOptions = { accessToken };

  const [routines, setRoutines] = useState<GygRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RoutinesFilterValue>(DEFAULT_FILTER);
  const [viewMode, setViewMode] = useState<RoutinesViewMode>("cards");

  useEffect(() => {
    async function load() {
      try {
        const data = await listRoutines(apiOptions, "geology_geophysics");
        setRoutines(data);
      } catch (e) {
        console.error("Failed to load routines:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [accessToken]);

  const filteredRoutines = useMemo(
    () => filterRoutines(routines, filter),
    [routines, filter]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" aria-hidden />
        <p className="mt-3 text-sm text-slate-500">Cargando rutinas…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
              <Link
                href="/gyg"
                className="hover:text-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 rounded"
              >
                Geology & Geophysics
              </Link>
              <span className="mx-1">/</span>
              <span className="text-slate-700">Routines</span>
            </nav>
            <h1 className="text-2xl font-semibold text-slate-800">Routines</h1>
            <p className="mt-1 text-sm text-slate-500">
              Catalog of operational routines for Geology &amp; Geophysics.
            </p>
          </div>
        </div>
      </div>

      <RoutinesFilters
        filter={filter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        routinesCount={filteredRoutines.length}
      />

      {routines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
          <FolderOpen className="h-14 w-14 text-slate-400" aria-hidden />
          <h3 className="mt-4 text-sm font-semibold text-slate-700">No hay rutinas</h3>
          <p className="mt-1 max-w-xs px-4 text-center text-sm text-slate-500">
            Aún no hay rutinas configuradas. Puedes cargarlas vía seed o API.
          </p>
          <Link
            href="/gyg"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Geology & Geophysics
          </Link>
        </div>
      ) : filteredRoutines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
          <p className="text-sm font-medium text-slate-600">
            Ninguna rutina coincide con los filtros actuales
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Prueba a ajustar la búsqueda o los filtros
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRoutines.map((r) => (
            <RoutineCard key={r.id} routine={r} />
          ))}
        </div>
      ) : (
        <RoutineListView routines={filteredRoutines} />
      )}
    </div>
  );
}
