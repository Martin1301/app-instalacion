"use client";

import {
ClipboardCheck,
Clock3,
CheckCircle2,
AlertCircle,
Monitor,
Users,
Package,
Loader2,
Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";

type Program = {
id: number;
nombre: string;
};

type InstallationProgram = {
id: number;
programId: number;
status: string;
installed: boolean;
configured: boolean;
program: Program;
};

type User = {
id: number;
username: string;
nombres?: string | null;
apellidos?: string | null;
role: string;
};

type Equipment = {
id: number;
codigo: string;
hostname?: string | null;
ip?: string | null;
};

type Installation = {
id: number;
codigo: string;
status: string;
priority: string;
createdAt: string;
equipment: Equipment;
createdBy: User;
assignedSupport?: User | null;
installationPrograms: InstallationProgram[];
_count: {
comments: number;
};
};

type CurrentUser = {
id: number;
username: string;
role: string;
};

export default function DashboardPage() {
const [installations, setInstallations] = useState<Installation[]>([]);
const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
loadDashboard();
}, []);

async function loadDashboard() {
try {
setLoading(true);


  const [meResponse, installationsResponse] = await Promise.all([
    fetch("/api/auth/me"),
    fetch("/api/instalaciones"),
  ]);

  if (meResponse.ok) {
    const meData = await meResponse.json();

    const user = meData.user ?? meData;

    setCurrentUser({
      id: Number(user.id),
      username: user.username,
      role: user.role,
    });
  }

  if (installationsResponse.ok) {
    const data = await installationsResponse.json();

    if (Array.isArray(data)) {
      setInstallations(data);
    } else {
      setInstallations([]);
    }
  }
} catch (error) {
  console.error("Error cargando dashboard:", error);
  setInstallations([]);
} finally {
  setLoading(false);
}


}

/**

* Calcula el progreso real de una instalación.
*
* Un programa se considera completado cuando:
* * está instalado
* * y está configurado
    */
    const getProgress = (installation: Installation) => {
    const totalPrograms =
    installation.installationPrograms?.length ?? 0;


if (totalPrograms === 0) return 0;

const completedPrograms =
  installation.installationPrograms.filter(
    (program) =>
      program.installed &&
      program.configured
  ).length;

return Math.round(
  (completedPrograms / totalPrograms) * 100
);


};

const total = installations.length;

/**

* Pendientes:
* instalaciones activas cuyo progreso todavía es 0%.
  */
  const pending = installations.filter(
  (installation) =>
  installation.status !== "COMPLETADA" &&
  installation.status !== "CANCELADA" &&
  getProgress(installation) === 0
  ).length;

/**

* En progreso:
* instalaciones activas que ya tienen algún avance.
*
* Incluso si tienen 100% pero todavía no han sido
* formalmente finalizadas, continúan formando parte
* del trabajo activo.
  */
  const inProgress = installations.filter(
  (installation) =>
  installation.status !== "COMPLETADA" &&
  installation.status !== "CANCELADA" &&
  getProgress(installation) > 0
  ).length;

const completed = installations.filter(
(installation) =>
installation.status === "COMPLETADA"
).length;

/**

* Últimas instalaciones.
  */
  const recentInstallations = [...installations]
  .sort(
  (a, b) =>
  new Date(b.createdAt).getTime() -
  new Date(a.createdAt).getTime()
  )
  .slice(0, 5);

const stats = [
{
title: "Total instalaciones",
value: total,
description: "Registradas en el sistema",
icon: ClipboardCheck,
},
{
title: "Pendientes",
value: pending,
description: "Instalaciones sin iniciar",
icon: Clock3,
},
{
title: "En progreso",
value: inProgress,
description: "Instalaciones activas",
icon: AlertCircle,
},
{
title: "Completadas",
value: completed,
description: "Instalaciones finalizadas",
icon: CheckCircle2,
},
];

const modules = [
{
title: "Usuarios",
description: "Gestiona usuarios y roles",
icon: Users,
href: "/usuarios",
},
{
title: "Equipos",
description: "Administra los equipos registrados",
icon: Monitor,
href: "/equipos",
},
{
title: "Programas",
description: "Gestiona el catálogo de software",
icon: Package,
href: "/programas",
},
{
title: "Instalaciones",
description: "Controla las instalaciones de software",
icon: ClipboardCheck,
href: "/instalaciones",
},
];

return ( <main className="min-h-screen bg-slate-100 p-4 md:p-6 lg:p-8"> <div className="mx-auto max-w-7xl space-y-6">
{/* Encabezado */} <div> <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
Dashboard </h1>

```
      <p className="mt-1 text-sm text-slate-500">
        Resumen general de Instalaciones TI
      </p>
    </div>

    {/* Tarjetas */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {stat.title}
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loading ? (
                    <Loader2
                      size={28}
                      className="animate-spin text-slate-400"
                    />
                  ) : (
                    stat.value
                  )}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Icon size={22} />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              {stat.description}
            </p>
          </div>
        );
      })}
    </div>

    {/* Módulos */}
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Módulos
        </h2>

        <p className="text-sm text-slate-500">
          Acceso rápido a las principales funciones
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <a
              key={module.title}
              href={module.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white transition group-hover:bg-slate-700">
                <Icon size={23} />
              </div>

              <h3 className="font-semibold text-slate-900">
                {module.title}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {module.description}
              </p>
            </a>
          );
        })}
      </div>
    </section>

    {/* Instalaciones recientes */}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900">
          Instalaciones recientes
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Últimas instalaciones registradas
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center">
          <Loader2
            size={30}
            className="animate-spin text-slate-400"
          />
        </div>
      ) : recentInstallations.length === 0 ? (
        <div className="flex min-h-56 items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <ClipboardCheck size={26} />
            </div>

            <h3 className="mt-4 font-medium text-slate-700">
              No hay instalaciones todavía
            </h3>

            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Las instalaciones registradas aparecerán aquí.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {recentInstallations.map((installation) => {
            const progress = getProgress(installation);

            return (
              <a
                key={installation.id}
                href={`/instalaciones/${installation.id}`}
                className="block p-5 transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {installation.codigo}
                      </span>

                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {installation.status}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Equipo:{" "}
                      <span className="font-medium text-slate-700">
                        {installation.equipment?.codigo ?? "Sin equipo"}
                      </span>
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(
                        installation.createdAt
                      ).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="w-full md:w-56">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Progreso
                      </span>

                      <span className="text-xs font-semibold text-slate-700">
                        {progress}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-900 transition-all"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {!loading && recentInstallations.length > 0 && (
        <div className="border-t border-slate-200 p-4 text-center">
          <a
            href="/instalaciones"
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Ver todas las instalaciones →
          </a>
        </div>
      )}
    </section>
  </div>
</main>

);
}
