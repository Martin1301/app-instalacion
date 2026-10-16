
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Building2,
  ClipboardCheck,
  Layers3,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

type Area = {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
};

type Programa = {
  id: number;
  nombre: string;
  descripcion: string | null;
  version: string | null;
  activo: boolean;
};

type PlantillaPrograma = {
  program: Programa;
};

type Plantilla = {
  id: number;
  areaId: number;
  descripcion: string | null;
  area: {
    id: number;
    nombre: string;
  };
  programs: PlantillaPrograma[];
};

type Notificacion = {
  tipo: "exito" | "error";
  mensaje: string;
};

async function leerRespuesta(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "No se pudo completar la operación."
    );
  }

  return data;
}

export default function PlantillasAreaPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [notificacion, setNotificacion] =
    useState<Notificacion | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [plantillaEditando, setPlantillaEditando] =
    useState<number | null>(null);

  const [areaId, setAreaId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [programIds, setProgramIds] = useState<number[]>([]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);

    try {
      const [areasData, programasData, plantillasData] =
        await Promise.all([
          fetch("/api/areas", { cache: "no-store" }).then(
            leerRespuesta
          ),
          fetch("/api/programas", { cache: "no-store" }).then(
            leerRespuesta
          ),
          fetch("/api/plantillas-area", { cache: "no-store" }).then(
            leerRespuesta
          ),
        ]);

      if (
        !Array.isArray(areasData) ||
        !Array.isArray(programasData) ||
        !Array.isArray(plantillasData)
      ) {
        throw new Error("La API devolvió un formato inesperado.");
      }

      setAreas(areasData);
      setProgramas(
        programasData.filter(
          (programa: Programa) => programa.activo === true
        )
      );
      setPlantillas(plantillasData);
    } catch (error) {
      setNotificacion({
        tipo: "error",
        mensaje:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los datos.",
      });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const areasActivas = useMemo(
    () => areas.filter((area) => area.estado === true),
    [areas]
  );

  const plantillasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return plantillas;

    return plantillas.filter(
      (plantilla) =>
        plantilla.area.nombre.toLowerCase().includes(texto) ||
        (plantilla.descripcion ?? "").toLowerCase().includes(texto) ||
        plantilla.programs.some((item) =>
          item.program.nombre.toLowerCase().includes(texto)
        )
    );
  }, [plantillas, busqueda]);

  const areasSinPlantilla = useMemo(
    () =>
      areasActivas.filter(
        (area) =>
          !plantillas.some(
            (plantilla) => plantilla.areaId === area.id
          )
      ),
    [areasActivas, plantillas]
  );

  function abrirCrear() {
    setPlantillaEditando(null);
    setAreaId("");
    setDescripcion("");
    setProgramIds([]);
    setNotificacion(null);
    setModalAbierto(true);
  }

  function abrirEditar(plantilla: Plantilla) {
    setPlantillaEditando(plantilla.id);
    setAreaId(String(plantilla.areaId));
    setDescripcion(plantilla.descripcion ?? "");
    setProgramIds(
      plantilla.programs.map((item) => item.program.id)
    );
    setNotificacion(null);
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);
    setPlantillaEditando(null);
    setNotificacion(null);
  }

  function alternarPrograma(id: number) {
    setProgramIds((actuales) =>
      actuales.includes(id)
        ? actuales.filter((actual) => actual !== id)
        : [...actuales, id]
    );
  }

  async function eliminarPlantilla(plantilla: Plantilla) {
    const confirmar = window.confirm(
      `¿Eliminar la plantilla del área "${plantilla.area.nombre}"?\n\n` +
        "Los perfiles de los usuarios y las instalaciones existentes no se modificarán."
    );

    if (!confirmar) return;

    setNotificacion(null);
    setEliminandoId(plantilla.id);

    try {
      const response = await fetch(
        `/api/plantillas-area/${plantilla.id}`,
        { method: "DELETE" }
      );

      await leerRespuesta(response);

      setNotificacion({
        tipo: "exito",
        mensaje: "Plantilla eliminada correctamente.",
      });

      await cargarDatos();
    } catch (error) {
      setNotificacion({
        tipo: "error",
        mensaje:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la plantilla.",
      });
    } finally {
      setEliminandoId(null);
    }
  }

  async function guardarPlantilla(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setNotificacion(null);

    if (!plantillaEditando && !areaId) {
      setNotificacion({
        tipo: "error",
        mensaje: "Selecciona un área.",
      });
      return;
    }

    if (programIds.length === 0) {
      setNotificacion({
        tipo: "error",
        mensaje: "Selecciona al menos un programa activo.",
      });
      return;
    }

    setGuardando(true);

    try {
      const url = plantillaEditando
        ? `/api/plantillas-area/${plantillaEditando}`
        : "/api/plantillas-area";

      const response = await fetch(url, {
        method: plantillaEditando ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(!plantillaEditando && {
            areaId: Number(areaId),
          }),
          descripcion: descripcion.trim() || null,
          programIds,
        }),
      });

      await leerRespuesta(response);

      setModalAbierto(false);
      setPlantillaEditando(null);

      setNotificacion({
        tipo: "exito",
        mensaje: plantillaEditando
          ? "Plantilla actualizada correctamente."
          : "Plantilla creada correctamente.",
      });

      await cargarDatos();
    } catch (error) {
      setNotificacion({
        tipo: "error",
        mensaje:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la plantilla.",
      });
    } finally {
      setGuardando(false);
    }
  }

  const seleccionarTodos = () => {
    setProgramIds((actuales) =>
      actuales.length === programas.length
        ? []
        : programas.map((programa) => programa.id)
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
            <ClipboardList size={25} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Plantillas por área
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Administra los programas estándar de cada área.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void cargarDatos()}
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={cargando ? "animate-spin" : ""}
            />
            Actualizar
          </button>

          <button
            type="button"
            onClick={abrirCrear}
            disabled={areasSinPlantilla.length === 0 || cargando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />
            Nueva plantilla
          </button>
        </div>
      </div>

      {/* Notificaciones */}
      {notificacion && !modalAbierto && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            notificacion.tipo === "exito"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notificacion.tipo === "exito" ? (
            <CheckCircle2
              className="mt-0.5 shrink-0"
              size={20}
            />
          ) : (
            <AlertCircle
              className="mt-0.5 shrink-0"
              size={20}
            />
          )}

          <p className="flex-1 text-sm">
            {notificacion.mensaje}
          </p>

          <button
            type="button"
            onClick={() => setNotificacion(null)}
            aria-label="Cerrar notificación"
            className="rounded-lg p-1 transition hover:bg-black/5"
          >
            <X size={18} />
          </button>
        </div>
      )}

     
      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Plantillas creadas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Plantillas creadas
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {plantillas.length}
              </p>
            </div>

            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <ClipboardCheck size={25} />
            </div>
          </div>
        </div>

        {/* Áreas activas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Áreas activas
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {areasActivas.length}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <Building2 size={25} />
            </div>
          </div>
        </div>

        {/* Áreas sin plantilla */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Áreas sin plantilla
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {areasSinPlantilla.length}
              </p>
            </div>

            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <Layers3 size={25} />
            </div>
          </div>
        </div>
      </div>


      {/* Tabla de plantillas */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="relative max-w-lg">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por área, descripción o programa..."
              aria-label="Buscar plantillas"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center gap-3 p-12 text-slate-500">
            <Loader2 className="animate-spin" size={22} />
            Cargando plantillas...
          </div>
        ) : plantillasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList
              className="mx-auto mb-3 text-slate-300"
              size={42}
            />

            <p className="font-semibold text-slate-700">
              {plantillas.length === 0
                ? "Todavía no hay plantillas"
                : "No se encontraron resultados"}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {plantillas.length === 0
                ? "Crea una plantilla para comenzar a organizar los programas por área."
                : "Prueba con otro término de búsqueda."}
            </p>

            {plantillas.length === 0 &&
              areasSinPlantilla.length > 0 && (
                <button
                  type="button"
                  onClick={abrirCrear}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus size={17} />
                  Crear primera plantilla
                </button>
              )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    Área
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    Descripción
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    Programas
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {plantillasFiltradas.map((plantilla) => (
                  <tr
                    key={plantilla.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {plantilla.area.nombre}
                    </td>

                    <td className="max-w-xs px-5 py-4 text-slate-600">
                      {plantilla.descripcion || "Sin descripción"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {plantilla.programs.length}{" "}
                        {plantilla.programs.length === 1
                          ? "programa"
                          : "programas"}
                      </span>
                    </td>

                    {/* Acciones: editar y eliminar */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Editar plantilla"
                          aria-label={`Editar plantilla de ${plantilla.area.nombre}`}
                          onClick={() => abrirEditar(plantilla)}
                          disabled={eliminandoId !== null}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Edit size={17} />
                        </button>

                        <button
                          type="button"
                          title="Eliminar plantilla"
                          aria-label={`Eliminar plantilla de ${plantilla.area.nombre}`}
                          onClick={() =>
                            void eliminarPlantilla(plantilla)
                          }
                          disabled={eliminandoId !== null}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {eliminandoId === plantilla.id ? (
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={17} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para crear o editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 pt-8 sm:pt-12">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="plantilla-titulo"
            className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2
                  id="plantilla-titulo"
                  className="text-xl font-bold text-slate-900"
                >
                  {plantillaEditando
                    ? "Editar plantilla"
                    : "Nueva plantilla"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Selecciona el área y los programas que formarán parte
                  de la plantilla.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar formulario"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={guardarPlantilla}>
              <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6">
                {/* Área */}
                <div>
                  <label
                    htmlFor="area"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Área <span className="text-red-500">*</span>
                  </label>

                  <select
                    id="area"
                    value={areaId}
                    onChange={(event) => setAreaId(event.target.value)}
                    disabled={Boolean(plantillaEditando) || guardando}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  >
                    <option value="">Seleccionar área...</option>

                    {(plantillaEditando
                      ? areasActivas
                          .filter(
                            (area) => String(area.id) === areaId
                          )
                          .concat(
                            areasActivas.filter(
                              (area) =>
                                String(area.id) !== areaId &&
                                !plantillas.some(
                                  (plantilla) =>
                                    plantilla.areaId === area.id
                                )
                            )
                          )
                      : areasSinPlantilla
                    ).map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nombre}
                      </option>
                    ))}

                    {plantillaEditando &&
                      !areasActivas.some(
                        (area) => String(area.id) === areaId
                      ) &&
                      areas
                        .filter((area) => String(area.id) === areaId)
                        .map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.nombre} (inactiva)
                          </option>
                        ))}
                  </select>

                  {plantillaEditando && (
                    <p className="mt-1 text-xs text-slate-500">
                      El área no se puede cambiar al editar una plantilla.
                    </p>
                  )}
                </div>

                {/* Descripción */}
                <div>
                  <label
                    htmlFor="descripcion"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Descripción
                  </label>

                  <textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={(event) =>
                      setDescripcion(event.target.value)
                    }
                    maxLength={500}
                    rows={3}
                    placeholder="Describe el propósito de esta plantilla..."
                    disabled={guardando}
                    className="w-full resize-y rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />

                  <p className="mt-1 text-right text-xs text-slate-400">
                    {descripcion.length}/500 caracteres
                  </p>
                </div>

                {/* Selección de programas */}
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        Programas activos
                      </h3>

                      <p className="text-xs text-slate-500">
                        Seleccionados: {programIds.length}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={guardando || programas.length === 0}
                      onClick={seleccionarTodos}
                      className="text-sm font-medium text-blue-700 transition hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {programIds.length === programas.length &&
                      programas.length > 0
                        ? "Deseleccionar todos"
                        : "Seleccionar todos"}
                    </button>
                  </div>

                  {programas.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      No hay programas activos disponibles en el catálogo.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {programas.map((programa) => {
                        const seleccionado = programIds.includes(
                          programa.id
                        );

                        return (
                          <label
                            key={programa.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                              seleccionado
                                ? "border-blue-400 bg-blue-50"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={seleccionado}
                              disabled={guardando}
                              onChange={() =>
                                alternarPrograma(programa.id)
                              }
                              className="mt-1 h-4 w-4 accent-blue-600"
                            />

                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-slate-800">
                                {programa.nombre}
                              </span>

                              {programa.version && (
                                <span className="mt-1 block text-xs text-slate-500">
                                  Versión: {programa.version}
                                </span>
                              )}

                              {programa.descripcion && (
                                <span className="mt-1 block text-xs text-slate-500">
                                  {programa.descripcion}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Error dentro del modal */}
                {notificacion?.tipo === "error" && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                    />
                    <span>{notificacion.mensaje}</span>
                  </div>
                )}
              </div>

              {/* Botones del formulario */}
              <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando || programas.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando ? (
                    <Loader2
                      className="animate-spin"
                      size={17}
                    />
                  ) : (
                    <Save size={17} />
                  )}

                  {guardando
                    ? "Guardando..."
                    : plantillaEditando
                      ? "Guardar cambios"
                      : "Crear plantilla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
