"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ExternalLink, Globe, Loader2, TriangleAlert } from "lucide-react";
import BackButton from "@/components/BackButton";
import { getApplication, type DrillingApplication } from "@/lib/api/drilling";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; app: DrillingApplication }
  | { kind: "notFound" }
  | { kind: "error" };

function isNotFoundError(e: unknown): boolean {
  return e instanceof Error && e.message.includes("API error 404");
}

export default function DrillingAppViewerPage() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? null;

  const id = useMemo(() => {
    const raw = params?.id;
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  }, [params]);

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeErrored, setIframeErrored] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const load = async () => {
      setState({ kind: "loading" });
      setIframeLoading(true);
      setIframeErrored(false);

      try {
        const app = await getApplication(id, { accessToken });
        if (cancelled) return;
        setState({ kind: "ready", app });
      } catch (e) {
        if (cancelled) return;
        if (isNotFoundError(e)) setState({ kind: "notFound" });
        else setState({ kind: "error" });
        setIframeLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, accessToken]);

  if (!id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Aplicación</h1>
            <p className="mt-1 text-sm text-slate-500">Visor de aplicaciones de Drilling.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <TriangleAlert className="h-5 w-5" aria-hidden />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-slate-800">
                No encontramos esta aplicación
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                El identificador es inválido o está incompleto.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => router.push("/drilling")}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
                >
                  Volver a Drilling
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" aria-hidden />
        <p className="mt-3 text-sm text-slate-500">Cargando aplicación…</p>
      </div>
    );
  }

  if (state.kind === "notFound" || state.kind === "error") {
    const is404 = state.kind === "notFound";
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Aplicación</h1>
            <p className="mt-1 text-sm text-slate-500">Visor de aplicaciones de Drilling.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                is404 ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"
              }`}
            >
              <TriangleAlert className="h-5 w-5" aria-hidden />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-slate-800">
                {is404 ? "No encontramos esta aplicación" : "No pudimos cargar la aplicación"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {is404
                  ? "Puede que no exista o que no pertenezca al módulo Drilling."
                  : "Inténtalo de nuevo. Mientras tanto, vuelve a Drilling."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => router.push("/drilling")}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
                >
                  Volver a Drilling
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const app = state.app;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">{app.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{app.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/drilling"
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Catálogo
          </Link>
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Abrir en nueva pestaña
          </a>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Globe className="h-4 w-4 text-cyan-600" aria-hidden />
            <span>Visor en portal</span>
          </div>
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Abrir afuera <span aria-hidden>→</span>
          </a>
        </div>

        <div className="relative">
          {iframeLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-600" aria-hidden />
              <p className="text-sm text-slate-500">Cargando contenido…</p>
              <p className="text-xs text-slate-400">
                Si no carga, usa “Abrir en nueva pestaña”.
              </p>
            </div>
          )}

          {iframeErrored && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <TriangleAlert className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  No se pudo mostrar la aplicación embebida
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Es posible que el sitio externo bloquee el embed. Puedes abrirla en una nueva pestaña.
                </p>
              </div>
              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Abrir en nueva pestaña
              </a>
            </div>
          )}

          <iframe
            key={app.id}
            src={app.url}
            title={app.name}
            className="w-full h-[calc(100vh-220px)] min-h-[500px] bg-white"
            onLoad={() => setIframeLoading(false)}
            onError={() => {
              setIframeLoading(false);
              setIframeErrored(true);
            }}
          />
        </div>
      </div>
    </div>
  );
}

