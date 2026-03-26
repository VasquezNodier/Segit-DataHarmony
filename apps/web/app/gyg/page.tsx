"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Loader2, Activity, Play, ArrowRight } from "lucide-react";
import BackButton from "@/components/BackButton";
import {
  listRoutines,
  listScripts,
  listApplications,
  listDocuments,
  type GygRoutine,
  type GygScript,
  type GygApplication,
  type GygDocument,
} from "@/lib/api/geology-geophysics";
import RoutineCard from "@/components/routines/RoutineCard";
import GygTabs from "./GygTabs";

const LANDING_ROUTINES_LIMIT = 4;

export default function GeologyGeophysicsPage() {
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? null;
  const apiOptions = { accessToken };

  const [routines, setRoutines] = useState<GygRoutine[]>([]);
  const [scripts, setScripts] = useState<GygScript[]>([]);
  const [applications, setApplications] = useState<GygApplication[]>([]);
  const [documents, setDocuments] = useState<GygDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [rts, s, a, d] = await Promise.all([
          listRoutines(apiOptions, "geology_geophysics"),
          listScripts(apiOptions),
          listApplications(apiOptions),
          listDocuments(apiOptions),
        ]);
        setRoutines(rts);
        setScripts(s);
        setApplications(a);
        setDocuments(d);
      } catch (e) {
        console.error("Failed to load geology_geophysics data:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [accessToken]);

  const landingRoutines = routines.slice(0, LANDING_ROUTINES_LIMIT);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" aria-hidden />
        <p className="mt-3 text-sm text-slate-500">Cargando Geology &amp; Geophysics…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Geology &amp; Geophysics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Operational routines, scripts, applications and documentation for Geology &amp; Geophysics.
          </p>
        </div>
      </div>

      {/* Routines summary — landing: 4–6 cards + Ver todas */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 text-white">
              <Play className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Executable routines</h2>
              <p className="text-xs text-slate-500">
                Catalog of operational routines for Geology &amp; Geophysics.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/gyg/routines"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
              aria-label={`${routines.length} rutinas disponibles — Ver catálogo`}
            >
              <Activity className="h-4 w-4 text-slate-400" aria-hidden />
              <span>
                <span className="font-semibold text-slate-700">{routines.length}</span> rutinas disponibles
              </span>
            </Link>
          </div>
        </div>
        {routines.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no hay rutinas configuradas para este módulo. Puedes cargarlas vía seed o API.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {landingRoutines.map((r) => (
              <RoutineCard key={r.id} routine={r} compact />
            ))}
          </div>
        )}
      </section>

      {/* Shared sections: scripts / applications / documents */}
      <GygTabs
        scripts={scripts}
        applications={applications}
        documents={documents}
        apiOptions={apiOptions}
      />
    </div>
  );
}

