"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import DrillingTabs from "./DrillingTabs";
import {
  listScripts,
  listApplications,
  listDocuments,
  type DrillingScript,
  type DrillingApplication,
  type DrillingDocument,
} from "@/lib/api/drilling";

export default function DrillingPage() {
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? null;
  const apiOptions = { accessToken };

  const [scripts, setScripts] = useState<DrillingScript[]>([]);
  const [applications, setApplications] = useState<DrillingApplication[]>([]);
  const [documents, setDocuments] = useState<DrillingDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, a, d] = await Promise.all([
          listScripts(apiOptions),
          listApplications(apiOptions),
          listDocuments(apiOptions),
        ]);
        setScripts(s);
        setApplications(a);
        setDocuments(d);
      } catch (e) {
        console.error("Failed to load drilling data:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" aria-hidden />
        <p className="mt-3 text-sm text-slate-500">Cargando Drilling…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Drilling</h1>
          <p className="mt-1 text-sm text-slate-500">
            Scripts, aplicaciones y documentación para operaciones de perforación.
          </p>
        </div>
      </div>

      <DrillingTabs
        scripts={scripts}
        applications={applications}
        documents={documents}
        apiOptions={apiOptions}
      />
    </div>
  );
}
