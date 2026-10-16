"use client";

import { useEffect, useState } from "react";

import {
Building2,
CalendarDays,
CheckCircle2,
ChevronDown,
ChevronLeft,
ChevronRight,
Cpu,
HardDrive,
Laptop,
Loader2,
MapPin,
Network,
Search,
ShieldCheck,
User,
Wrench,
XCircle,
} from "lucide-react";

// =====================================================
// TIPOS
// =====================================================

type EquipmentStatus =
| "ACTIVO"
| "INACTIVO"
| "MANTENIMIENTO"
| "BAJA";

type ProgramSource = "EQUIPO" | "PERFIL";

type InstallationStatus =
| "PENDIENTE"
| "ASIGNADA"
| "EN_PROGRESO"
| "COMPLETADA"
| "CANCELADA";

type InstallationProgramStatus =
| "PENDIENTE"
| "INSTALANDO"
| "INSTALADO"
| "CONFIGURADO";

type Equipment = {
id: number;
codigo: string;
hostname: string;
ip: string;
marca: string | null;
modelo: string | null;
numeroSerie: string | null;
sistemaOperativo: string | null;
status: EquipmentStatus;
ubicacion: string | null;
observaciones: string | null;

area: {
id: number;
nombre: string;
} | null;

user: {
id: number;
username: string;
nombres: string;
apellidos: string;
email: string | null;
role: string;
status: string;
} | null;
};

type UserProgram = {
id: number;
programId: number;
equipmentId: number | null;
observaciones: string | null;
activo: boolean;
source: ProgramSource;

program: {
id: number;
nombre: string;
descripcion: string | null;
version: string | null;
activo: boolean;
};
};

type InstallationProgramHistory = {
id: number;
programId: number;
status: InstallationProgramStatus;
installed: boolean;
configured: boolean;
observaciones: string | null;
installedAt: string | null;
configuredAt: string | null;

program: {
id: number;
nombre: string;
descripcion: string | null;
version: string | null;
};
};

type InstallationHistory = {
id: number;
codigo: string;
status: InstallationStatus;

priority:
| "BAJA"
| "MEDIA"
| "ALTA"
| "URGENTE";

createdAt: string;
completedAt: string | null;
date: string;

scope: "TODOS" | "ALGUNOS";

programCount: number;

installationPrograms: InstallationProgramHistory[];
};

type Pagination = {
page: number;
limit: number;
total: number;
totalPages: number;
};

type Stats = {
totalInstallations: number;
completedInstallations: number;
};

// =====================================================
// ETIQUETAS
// =====================================================

const equipmentStatusLabels: Record<EquipmentStatus,string> = {
ACTIVO: "Activo",
INACTIVO: "Inactivo",
MANTENIMIENTO: "Mantenimiento",
BAJA: "Baja",
};

const installationStatusLabels: Record<InstallationStatus,string> = {
PENDIENTE: "Pendiente",
ASIGNADA: "Asignada",
EN_PROGRESO: "En progreso",
COMPLETADA: "Completada",
CANCELADA: "Cancelada",
};

// =====================================================
// UTILIDADES
// =====================================================

function getEquipmentStatusClasses(
status: EquipmentStatus
) {
switch (status) {
case "ACTIVO":
return {
badge:
"border-emerald-200 bg-emerald-50 text-emerald-700",
icon:
"bg-emerald-100 text-emerald-600",
};

case "MANTENIMIENTO":
  return {
    badge:
      "border-amber-200 bg-amber-50 text-amber-700",
    icon:
      "bg-amber-100 text-amber-600",
  };

case "INACTIVO":
  return {
    badge:
      "border-slate-200 bg-slate-50 text-slate-600",
    icon:
      "bg-slate-100 text-slate-500",
  };

case "BAJA":
  return {
    badge:
      "border-red-200 bg-red-50 text-red-700",
    icon:
      "bg-red-100 text-red-600",
  };

default:
  return {
    badge:
      "border-slate-200 bg-slate-50 text-slate-600",
    icon:
      "bg-slate-100 text-slate-500",
  };

}
}

function getInstallationStatusClasses(
status: InstallationStatus
) {
switch (status) {
case "COMPLETADA":
return "border-emerald-200 bg-emerald-50 text-emerald-700";


case "EN_PROGRESO":
  return "border-blue-200 bg-blue-50 text-blue-700";

case "ASIGNADA":
  return "border-violet-200 bg-violet-50 text-violet-700";

case "CANCELADA":
  return "border-red-200 bg-red-50 text-red-700";

case "PENDIENTE":
default:
  return "border-amber-200 bg-amber-50 text-amber-700";


}
}

function getInstallationProgramStatusClasses(
status: InstallationProgramStatus
) {
switch (status) {
case "CONFIGURADO":
return "border-emerald-200 bg-emerald-50 text-emerald-700";


case "INSTALADO":
  return "border-blue-200 bg-blue-50 text-blue-700";

case "INSTALANDO":
  return "border-violet-200 bg-violet-50 text-violet-700";

case "PENDIENTE":
default:
  return "border-slate-200 bg-slate-50 text-slate-600";


}
}

function getInstallationProgramStatusLabel(
status: InstallationProgramStatus
) {
switch (status) {
case "CONFIGURADO":
return "Configurado";


case "INSTALADO":
  return "Instalado";

case "INSTALANDO":
  return "Instalando";

case "PENDIENTE":
default:
  return "Pendiente";


}
}

function formatDate(date: string | null) {
if (!date) {
return "—";
}

return new Date(date).toLocaleString(
"es-PE",
{
dateStyle: "medium",
timeStyle: "short",
}
);
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function MiEquipoPage() {
// ===================================================
// ESTADOS
// ===================================================

const [equipment, setEquipment] =
useState<Equipment | null>(null);

const [programs, setPrograms] =
useState<UserProgram[]>([]);

const [installations, setInstallations] =
useState<InstallationHistory[]>([]);

const [pagination, setPagination] =
useState<Pagination>({
page: 1,
limit: 10,
total: 0,
totalPages: 0,
});

const [stats, setStats] =
useState<Stats>({
totalInstallations: 0,
completedInstallations: 0,
});

const [currentPage, setCurrentPage] =
useState(1);

const [searchInput, setSearchInput] =
useState("");

const [search, setSearch] =
useState("");

const [
expandedInstallation,
setExpandedInstallation,
] = useState<number | null>(null);

const [loading, setLoading] =
useState(true);

const [error, setError] =
useState("");

// ===================================================
// CARGAR DATOS
// ===================================================

async function loadData(
page: number,
searchTerm: string
) {
try {
setLoading(true);
setError("");

  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", "10");

  if (searchTerm.trim()) {
    params.set(
      "search",
      searchTerm.trim()
    );
  }

  const response = await fetch(
    `/api/mi-equipo?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const data = await response.json();

  console.log(
    "Respuesta /api/mi-equipo:",
    data
  );

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "No se pudo cargar la información del equipo"
    );
  }

  setEquipment(
    data.equipment ?? null
  );

  setPrograms(
    Array.isArray(data.programs)
      ? data.programs
      : []
  );

  setInstallations(
    Array.isArray(data.installations)
      ? data.installations
      : []
  );

  setPagination(
    data.pagination ?? {
      page,
      limit: 10,
      total: 0,
      totalPages: 0,
    }
  );

  setStats(
    data.stats ?? {
      totalInstallations: 0,
      completedInstallations: 0,
    }
  );

  setExpandedInstallation(null);
} catch (err) {
  console.error(
    "Error cargando Mi equipo:",
    err
  );

  setError(
    err instanceof Error
      ? err.message
      : "No se pudo cargar la información"
  );
} finally {
  setLoading(false);
}

}

// ===================================================
// CARGA INICIAL Y CAMBIO DE PÁGINA
// ===================================================

useEffect(() => {
loadData(
currentPage,
search
);

// eslint-disable-next-line react-hooks/exhaustive-deps

}, [currentPage]);

// ===================================================
// BUSCAR
// ===================================================

function handleSearch() {
const normalizedSearch =
searchInput.trim();

setSearch(normalizedSearch);

if (currentPage === 1) {
  loadData(
    1,
    normalizedSearch
  );
} else {
  setCurrentPage(1);
}

}

// ===================================================
// LIMPIAR BÚSQUEDA
// ===================================================

function handleClearSearch() {
setSearchInput("");
setSearch("");


if (currentPage === 1) {
  loadData(1, "");
} else {
  setCurrentPage(1);
}


}

// ===================================================
// ENTER EN BUSCADOR
// ===================================================

function handleSearchKeyDown(
event: React.KeyboardEvent<HTMLInputElement>
) {
if (event.key === "Enter") {
handleSearch();
}
}

// ===================================================
// ESTADÍSTICAS
// ===================================================

const totalPrograms =
programs.length;

const totalInstallations =
stats.totalInstallations;

const completedInstallations =
stats.completedInstallations;

// ===================================================
// LOADING
// ===================================================

if (loading && !equipment) {
return ( <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8"> <div className="mx-auto max-w-7xl">

```
      <div className="mb-6">
        <div className="flex items-center gap-3">

          <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-200" />

          <div>
            <div className="h-7 w-40 animate-pulse rounded-lg bg-slate-200" />

            <div className="mt-2 h-4 w-80 animate-pulse rounded bg-slate-200" />
          </div>

        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col gap-6 lg:flex-row">

          <div className="h-20 w-20 animate-pulse rounded-2xl bg-slate-200" />

          <div className="flex-1">

            <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />

            <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-200" />

            <div className="mt-3 flex gap-2">

              <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-200" />

              <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-200" />

            </div>

          </div>

        </div>

      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-2xl bg-white shadow-sm"
          />
        ))}

      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />

        <div className="mt-6 space-y-3">

          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}

        </div>

      </div>

    </div>
  </div>
);


}

// ===================================================
// ERROR
// ===================================================

if (error && !equipment) {
return ( <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8"> <div className="mx-auto max-w-7xl">


      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">

        <div className="flex items-start gap-3">

          <div className="rounded-xl bg-red-100 p-2 text-red-600">
            <XCircle size={22} />
          </div>

          <div>

            <h2 className="font-semibold text-red-900">
              No se pudo cargar Mi equipo
            </h2>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadData(
                  currentPage,
                  search
                )
              }
              className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Reintentar
            </button>

          </div>

        </div>

      </div>

    </div>
  </div>
);


}

// ===================================================
// SIN EQUIPO
// ===================================================

if (!equipment) {
return ( <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8"> <div className="mx-auto max-w-7xl">

```
      <div className="mb-6">

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-slate-900 p-2.5 text-white">
            <Laptop size={22} />
          </div>

          <div>

            <h1 className="text-2xl font-bold text-slate-900">
              Mi equipo
            </h1>

            <p className="text-sm text-slate-500">
              Información del equipo, programas e historial de instalaciones.
            </p>

          </div>

        </div>

      </div>

      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center shadow-sm">

        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Laptop size={32} />
        </div>

        <h2 className="text-lg font-bold text-slate-900">
          No tienes un equipo asignado
        </h2>

        <p className="mt-2 max-w-md text-sm text-slate-500">
          Actualmente no existe un equipo informático asociado a tu usuario.
        </p>

      </div>

    </div>
  </div>
);


}

// ===================================================
// ESTILOS DEL EQUIPO
// ===================================================

const equipmentStatusStyles =
getEquipmentStatusClasses(
equipment.status
);

// ===================================================
// PAGINACIÓN
// ===================================================

const currentPaginationPage =
pagination.page;

const totalPages =
pagination.totalPages;

function getPaginationPages() {
if (totalPages <= 7) {
return Array.from(
{ length: totalPages },
(_, index) => index + 1
);
}


const pages: (
  | number
  | "ellipsis-left"
  | "ellipsis-right"
)[] = [];

pages.push(1);

if (currentPaginationPage > 3) {
  pages.push("ellipsis-left");
}

const start = Math.max(
  2,
  currentPaginationPage - 1
);

const end = Math.min(
  totalPages - 1,
  currentPaginationPage + 1
);

for (
  let page = start;
  page <= end;
  page++
) {
  pages.push(page);
}

if (
  currentPaginationPage <
  totalPages - 2
) {
  pages.push("ellipsis-right");
}

pages.push(totalPages);

return pages;


}

// ===================================================
// RENDER
// ===================================================

return ( <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">


  <div className="mx-auto max-w-7xl">

    {/* ================================================= */}
    {/* HEADER */}
    {/* ================================================= */}

    <div className="mb-6">

      <div className="flex items-center gap-3">

        <div className="rounded-xl bg-slate-900 p-2.5 text-white">
          <Laptop size={22} />
        </div>

        <div>

          <h1 className="text-2xl font-bold text-slate-900">
            Mi equipo
          </h1>

          <p className="text-sm text-slate-500">
            Información del equipo, programas e historial de instalaciones.
          </p>

        </div>

      </div>

    </div>

    {/* ================================================= */}
    {/* INFORMACIÓN DEL EQUIPO */}
    {/* ================================================= */}

    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* CABECERA */}

      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${equipmentStatusStyles.icon}`}
            >
              <Laptop size={31} />
            </div>

            <div>

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-xl font-bold text-slate-900">
                  {equipment.codigo}
                </h2>

                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${equipmentStatusStyles.badge}`}
                >
                  {
                    equipmentStatusLabels[
                      equipment.status
                    ]
                  }
                </span>

              </div>

              <p className="mt-1 font-mono text-sm text-slate-500">
                {equipment.hostname}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">

                {(equipment.marca ||
                  equipment.modelo) && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                    <Cpu size={14} />

                    {[
                      equipment.marca,
                      equipment.modelo,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}

                {equipment.sistemaOperativo && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                    <HardDrive size={14} />

                    {equipment.sistemaOperativo}
                  </span>
                )}

              </div>

            </div>

          </div>

          {/* USUARIO */}

          {equipment.user && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <User size={19} />
              </div>

              <div>

                <p className="text-xs text-slate-400">
                  Usuario asignado
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  {equipment.user.nombres}{" "}
                  {equipment.user.apellidos}
                </p>

                <p className="text-xs text-slate-500">
                  @{equipment.user.username}
                </p>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* INFORMACIÓN TÉCNICA */}

      <div className="grid border-t border-slate-100 md:grid-cols-2 xl:grid-cols-4">

        <div className="border-b border-slate-100 p-5 md:border-r xl:border-b-0">

          <div className="flex items-center gap-2 text-slate-400">
            <Network size={16} />

            <span className="text-xs font-medium uppercase tracking-wide">
              Dirección IP
            </span>
          </div>

          <p className="mt-2 font-mono text-sm font-semibold text-slate-800">
            {equipment.ip}
          </p>

        </div>

        <div className="border-b border-slate-100 p-5 xl:border-r xl:border-b-0">

          <div className="flex items-center gap-2 text-slate-400">
            <Building2 size={16} />

            <span className="text-xs font-medium uppercase tracking-wide">
              Área
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-800">
            {equipment.area?.nombre ||
              "Sin área"}
          </p>

        </div>

        <div className="border-b border-slate-100 p-5 md:border-r md:border-b-0">

          <div className="flex items-center gap-2 text-slate-400">
            <MapPin size={16} />

            <span className="text-xs font-medium uppercase tracking-wide">
              Ubicación
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-800">
            {equipment.ubicacion ||
              "Sin ubicación"}
          </p>

        </div>

        <div className="p-5">

          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck size={16} />

            <span className="text-xs font-medium uppercase tracking-wide">
              Programas actuales
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-800">
            {totalPrograms}{" "}
            {totalPrograms === 1
              ? "programa"
              : "programas"}
          </p>

        </div>

      </div>

    </section>

    {/* ================================================= */}
    {/* ESTADÍSTICAS */}
    {/* ================================================= */}

    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

      {/* PROGRAMAS */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm font-medium text-slate-500">
              Programas actuales
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {totalPrograms}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Programas asociados actualmente a tu usuario
            </p>

          </div>

          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <ShieldCheck size={22} />
          </div>

        </div>

      </div>

      {/* HISTORIAL */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm font-medium text-slate-500">
              Historial de instalaciones
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {totalInstallations}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Instalaciones registradas en este equipo
            </p>

          </div>

          <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
            <Wrench size={22} />
          </div>

        </div>

      </div>

      {/* COMPLETADAS */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm font-medium text-slate-500">
              Instalaciones completadas
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {completedInstallations}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Trabajos finalizados correctamente
            </p>

          </div>

          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
            <CheckCircle2 size={22} />
          </div>

        </div>

      </div>

    </div>

    {/* ================================================= */}
    {/* PROGRAMAS ACTUALES */}
    {/* ================================================= */}

    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b border-slate-100 p-5 sm:p-6">

        <div className="flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ShieldCheck size={21} />
          </div>

          <div>

            <h2 className="text-lg font-bold text-slate-900">
              Programas actuales
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Programas asociados actualmente a tu usuario y equipo.
            </p>

          </div>

        </div>

      </div>

      <div className="p-4 sm:p-6">

        {programs.length === 0 ? (

          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">

            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
              <ShieldCheck size={25} />
            </div>

            <h3 className="font-semibold text-slate-800">
              No tienes programas asignados
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Actualmente no existen programas activos asociados a tu perfil o equipo.
            </p>

          </div>

        ) : (

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

            {programs.map((item) => (

              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >

                <div className="flex items-start gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Cpu size={19} />
                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="flex items-start justify-between gap-2">

                      <h3 className="truncate text-sm font-bold text-slate-800">
                        {item.program.nombre}
                      </h3>

                      {item.program.version && (
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-1 text-[10px] font-medium text-slate-500">
                          v{item.program.version}
                        </span>
                      )}

                    </div>

                    {item.program.descripcion && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {item.program.descripcion}
                      </p>
                    )}

                    <div className="mt-3">

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                          item.source === "EQUIPO"
                            ? "border-violet-200 bg-violet-50 text-violet-700"
                            : "border-blue-200 bg-blue-50 text-blue-700"
                        }`}
                      >
                        {item.source === "EQUIPO"
                          ? "EQUIPO"
                          : "PERFIL"}
                      </span>

                    </div>

                    {item.observaciones && (

                      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">

                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Observación
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {item.observaciones}
                        </p>

                      </div>

                    )}

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </section>

    {/* ================================================= */}
    {/* HISTORIAL DE INSTALACIONES */}
    {/* ================================================= */}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* CABECERA */}

      <div className="border-b border-slate-100 p-5 sm:p-6">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Wrench size={21} />
            </div>

            <div>

              <h2 className="text-lg font-bold text-slate-900">
                Historial de instalaciones
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Consulta las instalaciones realizadas en este equipo.
              </p>

            </div>

          </div>

          {/* BUSCADOR */}

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">

            <div className="relative min-w-0 flex-1 sm:w-72">

              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleSearchKeyDown
                }
                placeholder="Buscar por código..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {loading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Search size={16} />
              )}

              Buscar

            </button>

            {search && (
              <button
                type="button"
                onClick={
                  handleClearSearch
                }
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Limpiar
              </button>
            )}

          </div>

        </div>

      </div>

      {/* LISTADO */}

      <div className="p-4 sm:p-6">

        {loading && equipment && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">

            <Loader2
              size={17}
              className="animate-spin"
            />

            Cargando historial...

          </div>
        )}

        {installations.length === 0 ? (

          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">

            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
              <Wrench size={25} />
            </div>

            <h3 className="font-semibold text-slate-800">

              {search
                ? "No se encontraron instalaciones"
                : "No hay instalaciones registradas"}

            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">

              {search
                ? `No existe ninguna instalación cuyo código contenga "${search}".`
                : "Este equipo todavía no tiene instalaciones registradas en su historial."}

            </p>

          </div>

        ) : (

          <>

            {/* HISTORIAL */}

            <div className="space-y-3">

              {installations.map(
                (installation) => {

                  const isExpanded =
                    expandedInstallation ===
                    installation.id;

                  const isComplete =
                    installation.scope ===
                    "TODOS";

                  return (

                    <article
                      key={installation.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm"
                    >

                      {/* RESUMEN */}

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedInstallation(
                            isExpanded
                              ? null
                              : installation.id
                          )
                        }
                        className="w-full p-4 text-left transition hover:bg-slate-50 sm:p-5"
                      >

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                          {/* IZQUIERDA */}

                          <div className="flex min-w-0 items-start gap-3">

                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                isComplete
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-blue-50 text-blue-600"
                              }`}
                            >

                              {isComplete ? (
                                <CheckCircle2 size={21} />
                              ) : (
                                <Wrench size={21} />
                              )}

                            </div>

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <h3 className="font-bold text-slate-900">
                                  {installation.codigo}
                                </h3>

                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getInstallationStatusClasses(
                                    installation.status
                                  )}`}
                                >
                                  {
                                    installationStatusLabels[
                                      installation.status
                                    ]
                                  }
                                </span>

                              </div>

                              <p className="mt-1 text-sm font-semibold text-slate-700">

                                {isComplete
                                  ? "Instalación completa"
                                  : "Instalación de programas específicos"}

                              </p>

                              <p className="mt-1 text-xs text-slate-500">

                                {isComplete
                                  ? "Todos los programas"
                                  : "Solo algunos programas seleccionados"}

                              </p>

                            </div>

                          </div>

                          {/* DERECHA */}

                          <div className="flex flex-wrap items-center gap-4 lg:justify-end">

                            <div className="flex items-center gap-2 text-sm text-slate-500">

                              <ShieldCheck size={16} />

                              <span>

                                {installation.programCount}{" "}

                                {installation.programCount === 1
                                  ? "programa"
                                  : "programas"}

                              </span>

                            </div>

                            <div className="flex items-center gap-2 text-sm text-slate-500">

                              <CalendarDays size={16} />

                              <span>
                                {formatDate(
                                  installation.date
                                )}
                              </span>

                            </div>

                            <ChevronDown
                              size={20}
                              className={`shrink-0 text-slate-400 transition-transform ${
                                isExpanded
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />

                          </div>

                        </div>

                      </button>

                      {/* DETALLE */}

                      {isExpanded && (

                        <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">

                          {/* INFORMACIÓN */}

                          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                            <div className="rounded-xl border border-slate-200 bg-white p-4">

                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Instalación
                              </p>

                              <p className="mt-1 text-sm font-bold text-slate-800">
                                {installation.codigo}
                              </p>

                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4">

                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Tipo
                              </p>

                              <p className="mt-1 text-sm font-bold text-slate-800">

                                {isComplete
                                  ? "Instalación completa"
                                  : "Instalación parcial"}

                              </p>

                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4">

                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Programas
                              </p>

                              <p className="mt-1 text-sm font-bold text-slate-800">

                                {installation.programCount}{" "}

                                {installation.programCount === 1
                                  ? "programa"
                                  : "programas"}

                              </p>

                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4">

                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Fecha
                              </p>

                              <p className="mt-1 text-sm font-bold text-slate-800">
                                {formatDate(
                                  installation.date
                                )}
                              </p>

                            </div>

                          </div>

                          {/* PROGRAMAS */}

                          <div>

                            <div className="mb-4">

                              <h4 className="text-sm font-bold text-slate-800">
                                Programas incluidos
                              </h4>

                              <p className="mt-1 text-xs text-slate-500">
                                Programas registrados dentro de esta instalación.
                              </p>

                            </div>

                            {installation.installationPrograms.length === 0 ? (

                              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
                                No hay programas registrados para esta instalación.
                              </div>

                            ) : (

                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

                                {installation.installationPrograms.map(
                                  (item) => (

                                    <div
                                      key={item.id}
                                      className="rounded-xl border border-slate-200 bg-white p-4"
                                    >

                                      <div className="flex items-start gap-3">

                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                          <Cpu size={18} />
                                        </div>

                                        <div className="min-w-0 flex-1">

                                          <div className="flex items-start justify-between gap-2">

                                            <h5 className="text-sm font-semibold text-slate-800">
                                              {
                                                item.program.nombre
                                              }
                                            </h5>

                                            {item.program.version && (
                                              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-1 text-[10px] font-medium text-slate-500">
                                                v
                                                {
                                                  item.program.version
                                                }
                                              </span>
                                            )}

                                          </div>

                                          <span
                                            className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getInstallationProgramStatusClasses(
                                              item.status
                                            )}`}
                                          >
                                            {
                                              getInstallationProgramStatusLabel(
                                                item.status
                                              )
                                            }
                                          </span>

                                        </div>

                                      </div>

                                      {item.observaciones && (

                                        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">

                                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                            Observación
                                          </p>

                                          <p className="mt-1 text-xs leading-5 text-slate-600">
                                            {
                                              item.observaciones
                                            }
                                          </p>

                                        </div>

                                      )}

                                      {(item.installedAt ||
                                        item.configuredAt) && (

                                        <div className="mt-3 space-y-1">

                                          {item.installedAt && (

                                            <p className="text-[10px] text-slate-400">

                                              Instalado:{" "}

                                              <span className="font-medium text-slate-500">
                                                {formatDate(
                                                  item.installedAt
                                                )}
                                              </span>

                                            </p>

                                          )}

                                          {item.configuredAt && (

                                            <p className="text-[10px] text-slate-400">

                                              Configurado:{" "}

                                              <span className="font-medium text-slate-500">
                                                {formatDate(
                                                  item.configuredAt
                                                )}
                                              </span>

                                            </p>

                                          )}

                                        </div>

                                      )}

                                    </div>

                                  )
                                )}

                              </div>

                            )}

                          </div>

                        </div>

                      )}

                    </article>

                  );
                }
              )}

            </div>

            {/* ================================================= */}
            {/* PAGINACIÓN */}
            {/* ================================================= */}

            {totalPages > 0 && (

              <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="text-sm text-slate-500">

                  Mostrando{" "}

                  <span className="font-semibold text-slate-700">

                    {Math.min(
                      (currentPaginationPage - 1) *
                        pagination.limit +
                        1,
                      pagination.total
                    )}

                  </span>{" "}

                  a{" "}

                  <span className="font-semibold text-slate-700">

                    {Math.min(
                      currentPaginationPage *
                        pagination.limit,
                      pagination.total
                    )}

                  </span>{" "}

                  de{" "}

                  <span className="font-semibold text-slate-700">
                    {pagination.total}
                  </span>{" "}

                  instalaciones

                </div>

                <div className="flex items-center justify-center gap-1">

                  {/* ANTERIOR */}

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.max(
                            1,
                            page - 1
                          )
                      )
                    }
                    disabled={
                      currentPaginationPage <=
                        1 ||
                      loading
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >

                    <ChevronLeft size={16} />

                    <span className="hidden sm:inline">
                      Anterior
                    </span>

                  </button>

                  {/* NÚMEROS */}

                  {getPaginationPages().map(
                    (page, index) => {

                      if (
                        page ===
                        "ellipsis-left"
                      ) {
                        return (
                          <span
                            key={`left-${index}`}
                            className="flex h-9 w-9 items-center justify-center text-sm text-slate-400"
                          >
                            …
                          </span>
                        );
                      }

                      if (
                        page ===
                        "ellipsis-right"
                      ) {
                        return (
                          <span
                            key={`right-${index}`}
                            className="flex h-9 w-9 items-center justify-center text-sm text-slate-400"
                          >
                            …
                          </span>
                        );
                      }

                      const isCurrent =
                        page ===
                        currentPaginationPage;

                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() =>
                            setCurrentPage(
                              page
                            )
                          }
                          disabled={loading}
                          className={`h-9 min-w-9 rounded-lg px-2 text-sm font-semibold transition ${
                            isCurrent
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {page}
                        </button>
                      );
                    }
                  )}

                  {/* SIGUIENTE */}

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.min(
                            totalPages,
                            page + 1
                          )
                      )
                    }
                    disabled={
                      currentPaginationPage >=
                        totalPages ||
                      loading
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >

                    <span className="hidden sm:inline">
                      Siguiente
                    </span>

                    <ChevronRight size={16} />

                  </button>

                </div>

              </div>

            )}

          </>

        )}

      </div>

    </section>

    {/* ================================================= */}
    {/* OBSERVACIONES DEL EQUIPO */}
    {/* ================================================= */}

    {equipment.observaciones && (

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

        <div className="flex items-start gap-3">

          <div className="rounded-xl bg-slate-100 p-2.5 text-slate-500">
            <Laptop size={20} />
          </div>

          <div>

            <h2 className="font-bold text-slate-900">
              Observaciones del equipo
            </h2>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {equipment.observaciones}
            </p>

          </div>

        </div>

      </section>

    )}

  </div>

</div>

);
}
