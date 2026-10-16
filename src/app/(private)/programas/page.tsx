"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleOff,
  Edit,
  Package,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

type Program = {
  id: number;
  nombre: string;
  descripcion: string | null;
  version: string | null;
  activo: boolean;
  _count?: {
    userPrograms: number;
    installationPrograms: number;
  };
};

type MessageType = "success" | "error";

function MessageNotification({
  message,
  type,
  onClose,
}: {
  message: string;
  type: MessageType;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed left-0 right-0 top-4 z-[100] flex justify-center px-4">
      <div
        className={`flex w-full max-w-xl items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
          type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        <div className="flex-1 text-sm font-medium">{message}</div>

        <button
          type="button"
          onClick={onClose}
          className={`shrink-0 rounded-lg p-1 transition ${
            type === "success"
              ? "hover:bg-emerald-100"
              : "hover:bg-red-100"
          }`}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <Package size={30} className="text-slate-400" />
      </div>

      <h3 className="text-base font-semibold text-slate-800">
        No se encontraron programas
      </h3>

      <p className="mt-1 max-w-md text-sm text-slate-500">
        Todavía no hay programas registrados o ninguno coincide con la
        búsqueda.
      </p>
    </div>
  );
}

export default function ProgramasPage() {
  const [programas, setProgramas] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "TODOS" | "ACTIVOS" | "INACTIVOS"
  >("TODOS");

  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [version, setVersion] = useState("");
  const [activo, setActivo] = useState(true);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProgramas = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/programas", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudieron cargar los programas"
        );
      }

      setProgramas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar los programas"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgramas();
  }, []);

  const stats = useMemo(() => {
    return {
      total: programas.length,
      activos: programas.filter((programa) => programa.activo).length,
      inactivos: programas.filter((programa) => !programa.activo).length,
      asignados: programas.reduce(
        (total, programa) =>
          total + (programa._count?.userPrograms ?? 0),
        0
      ),
    };
  }, [programas]);

  const filteredProgramas = useMemo(() => {
    const text = search.trim().toLowerCase();

    return programas.filter((programa) => {
      const matchesSearch =
        !text ||
        programa.nombre.toLowerCase().includes(text) ||
        (programa.version ?? "").toLowerCase().includes(text) ||
        (programa.descripcion ?? "").toLowerCase().includes(text);

      const matchesStatus =
        statusFilter === "TODOS" ||
        (statusFilter === "ACTIVOS" && programa.activo) ||
        (statusFilter === "INACTIVOS" && !programa.activo);

      return matchesSearch && matchesStatus;
    });
  }, [programas, search, statusFilter]);

  const resetForm = () => {
    setNombre("");
    setDescripcion("");
    setVersion("");
    setActivo(true);
    setEditingProgram(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (programa: Program) => {
    setEditingProgram(programa);
    setNombre(programa.nombre);
    setDescripcion(programa.descripcion ?? "");
    setVersion(programa.version ?? "");
    setActivo(programa.activo);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!nombre.trim()) {
      setError("El nombre del programa es obligatorio.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const url = editingProgram
        ? `/api/programas/${editingProgram.id}`
        : "/api/programas";

      const method = editingProgram ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          version: version.trim(),
          activo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            (editingProgram
              ? "No se pudo actualizar el programa"
              : "No se pudo crear el programa")
        );
      }

      setShowModal(false);
      resetForm();

      setMessage(
        editingProgram
          ? "Programa actualizado correctamente."
          : "Programa creado correctamente."
      );

      await loadProgramas();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al guardar el programa."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (programa: Program) => {
    try {
      setError("");
      setMessage("");

      const response = await fetch(`/api/programas/${programa.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activo: !programa.activo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo cambiar el estado del programa"
        );
      }

      setMessage(
        programa.activo
          ? "Programa desactivado correctamente."
          : "Programa activado correctamente."
      );

      await loadProgramas();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar el estado del programa."
      );
    }
  };

  const handleDelete = async (programa: Program) => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el programa "${programa.nombre}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const response = await fetch(`/api/programas/${programa.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo eliminar el programa"
        );
      }

      setMessage("Programa eliminado correctamente.");

      await loadProgramas();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el programa."
      );
    }
  };

  const messageType: MessageType | null = message
    ? "success"
    : error
      ? "error"
      : null;

  const messageText = message || error;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      {messageType && messageText && (
        <MessageNotification
          message={messageText}
          type={messageType}
          onClose={() => {
            setMessage("");
            setError("");
          }}
        />
      )}

      {/* Encabezado */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Programas
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Administra los programas disponibles para las instalaciones TI.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={19} />
          Nuevo programa
        </button>
      </div>

      {/* Resumen */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total programas
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.total}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Package size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Programas activos
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">
                {stats.activos}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Programas inactivos
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-600">
                {stats.inactivos}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <CircleOff size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Asignaciones
              </p>
              <p className="mt-2 text-3xl font-bold text-violet-600">
                {stats.asignados}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Users size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, versión o descripción..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 text-slate-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "TODOS"
                  | "ACTIVOS"
                  | "INACTIVOS"
              )
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVOS">Activos</option>
            <option value="INACTIVOS">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center px-6 py-20">
            <div className="text-sm font-medium text-slate-500">
              Cargando programas...
            </div>
          </div>
        ) : filteredProgramas.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Vista escritorio */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Programa
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Versión
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Descripción
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Uso
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Estado
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProgramas.map((programa) => (
                    <tr
                      key={programa.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Package size={19} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {programa.nombre}
                            </p>

                            <p className="text-xs text-slate-400">
                              ID #{programa.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {programa.version || "—"}
                      </td>

                      <td className="max-w-xs px-5 py-4 text-sm text-slate-500">
                        <span className="line-clamp-2">
                          {programa.descripcion || "Sin descripción"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                          <Users size={14} />
                          {programa._count?.userPrograms ?? 0}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            programa.activo
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {programa.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            title="Editar"
                            onClick={() => openEditModal(programa)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit size={17} />
                          </button>

                          <button
                            type="button"
                            title={
                              programa.activo
                                ? "Desactivar"
                                : "Activar"
                            }
                            onClick={() => toggleStatus(programa)}
                            className={`rounded-lg p-2 transition ${
                              programa.activo
                                ? "text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {programa.activo ? (
                              <CircleOff size={17} />
                            ) : (
                              <CheckCircle2 size={17} />
                            )}
                          </button>

                          <button
                            type="button"
                            title="Eliminar"
                            onClick={() => handleDelete(programa)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista móvil/tablet */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredProgramas.map((programa) => (
                <div
                  key={programa.id}
                  className="p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Package size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">
                          {programa.nombre}
                        </p>

                        <p className="text-xs text-slate-400">
                          {programa.version
                            ? `Versión ${programa.version}`
                            : "Sin versión"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        programa.activo
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {programa.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    {programa.descripcion || "Sin descripción"}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                      <Users size={14} />
                      {programa._count?.userPrograms ?? 0} asignaciones
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => openEditModal(programa)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Edit size={17} />
                      </button>

                      <button
                        type="button"
                        title={
                          programa.activo
                            ? "Desactivar"
                            : "Activar"
                        }
                        onClick={() => toggleStatus(programa)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                      >
                        {programa.activo ? (
                          <CircleOff size={17} />
                        ) : (
                          <CheckCircle2 size={17} />
                        )}
                      </button>

                      <button
                        type="button"
                        title="Eliminar"
                        onClick={() => handleDelete(programa)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingProgram
                    ? "Editar programa"
                    : "Nuevo programa"}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {editingProgram
                    ? "Actualiza la información del programa."
                    : "Registra un nuevo programa para las instalaciones."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 px-5 py-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Nombre *
                  </label>

                  <input
                    type="text"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    placeholder="Ej. Microsoft Office"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-500"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Versión
                  </label>

                  <input
                    type="text"
                    value={version}
                    onChange={(event) => setVersion(event.target.value)}
                    placeholder="Ej. 2024"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-500"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Descripción
                  </label>

                  <textarea
                    value={descripcion}
                    onChange={(event) =>
                      setDescripcion(event.target.value)
                    }
                    placeholder="Descripción del programa..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-500"
                    disabled={saving}
                  />
                </div>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Programa activo
                    </p>

                    <p className="text-xs text-slate-500">
                      Los programas inactivos no se utilizarán para nuevas instalaciones.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(event) =>
                      setActivo(event.target.checked)
                    }
                    disabled={saving}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Guardando..."
                    : editingProgram
                      ? "Guardar cambios"
                      : "Crear programa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}