import Link from "next/link";
import { ArrowRight, Map, Play, BookOpen } from "lucide-react";
import BackButton from "@/components/BackButton";
import { getModuleById } from "@/lib/nav";

const SUBMODULE_META: Record<
  string,
  { description: string; badge?: string }
> = {
  "/cartography/split": {
    description:
      "Divide automáticamente un directorio de cartografía con PDF/MXD de varios pozos en carpetas individuales por pozo, copiando la subcarpeta SHP compartida.",
    badge: "Nuevo",
  },
  "/cartography/projects-index": {
    description:
      "Índice consolidado de proyectos cartográficos disponibles en los volúmenes.",
  },
  "/cartography/cultural-info": {
    description:
      "Información cultural y recursos de referencia para los entregables cartográficos.",
  },
};

const FALLBACK_ICON = Map;

export default function CartographyPage() {
  const module = getModuleById("cartography");
  const submodules = (module?.children ?? []).filter(
    (item) => item.href !== "/cartography",
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Cartografía</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestión de proyectos cartográficos y automatizaciones asociadas.
          </p>
        </div>
      </div>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Módulos disponibles
          </h2>
          <p className="text-sm text-slate-500">
            Accede a las herramientas y flujos del módulo de Cartografía.
          </p>
        </div>

        {submodules.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              Aún no hay submódulos registrados.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {submodules.map((item) => {
              const meta = SUBMODULE_META[item.href];
              const Icon = item.icon ?? FALLBACK_ICON;
              const isAction = item.href === "/cartography/split";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-cyan-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                        isAction
                          ? "bg-linear-to-br from-cyan-50 to-teal-50 text-cyan-600"
                          : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {meta?.badge && (
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-700 ring-1 ring-inset ring-cyan-200">
                        {meta.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-800 group-hover:text-cyan-700">
                    {item.label}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 line-clamp-3">
                    {meta?.description ?? "Abrir submódulo."}
                  </p>

                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600">
                    {isAction ? "Ejecutar" : "Abrir"}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-700">
              ¿No ves Cartografía en el menú lateral?
            </p>
            <p className="mt-1 text-xs text-slate-500">
              El sidebar solo muestra los módulos fijados. Ve al{" "}
              <Link
                href="/"
                className="font-medium text-cyan-700 hover:underline"
              >
                Home
              </Link>
              , localiza la tarjeta de <strong>Cartography</strong> y usa el
              ícono de pin para fijarla. Después aparecerá en el lateral con
              todos sus submódulos, incluido{" "}
              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                <Play className="h-3 w-3" /> Split by well
              </span>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
