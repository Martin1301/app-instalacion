"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Save,
  Building2,
  Users,
  Monitor,
} from "lucide-react";

type Area = {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
  _count: {
    users: number;
    equipment: number;
  };
};

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedArea, setSelectedArea] = useState<Area | null>(
    null
  );

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadAreas();
  }, []);

  async function loadAreas() {
    try {
      setLoading(true);

      const response = await fetch("/api/areas");

      if (!response.ok) {
        throw new Error("No se pudieron cargar las áreas");
      }

      const data = await response.json();

      setAreas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar las áreas"
      );
    } finally {
      setLoading(false);
    }
  }

  function resetMessages() {
    setMessage("");
    setError("");
  }

  function openNewModal() {
    resetMessages();

    setNombre("");
    setDescripcion("");

    setShowModal(true);
  }

  function openEditModal(area: Area) {
    resetMessages();

    setSelectedArea(area);

    setNombre(area.nombre);
    setDescripcion(area.descripcion || "");

    setShowEditModal(true);
  }

  function closeModals() {
    if (saving) return;

    setShowModal(false);
    setShowEditModal(false);
    setSelectedArea(null);
  }

  async function createArea(e: React.FormEvent) {
    e.preventDefault();

    resetMessages();
    setSaving(true);

    try {
      const response = await fetch("/api/areas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          descripcion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo crear el área"
        );
      }

      setShowModal(false);

      setMessage("Área creada correctamente.");

      await loadAreas();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al crear el área"
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateArea(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedArea) return;

    resetMessages();
    setSaving(true);

    try {
      const response = await fetch(
        `/api/areas/${selectedArea.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre,
            descripcion,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo actualizar el área"
        );
      }

      setShowEditModal(false);
      setSelectedArea(null);

      setMessage("Área actualizada correctamente.");

      await loadAreas();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al actualizar el área"
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(area: Area) {
    resetMessages();

    const nuevoEstado = !area.estado;

    const confirmar = window.confirm(
      `¿Deseas ${
        nuevoEstado ? "activar" : "desactivar"
      } el área "${area.nombre}"?`
    );

    if (!confirmar) return;

    try {
      const response = await fetch(
        `/api/areas/${area.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            estado: nuevoEstado,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo cambiar el estado"
        );
      }

      setMessage(
        nuevoEstado
          ? "Área activada correctamente."
          : "Área desactivada correctamente."
      );

      await loadAreas();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cambiar el estado"
      );
    }
  }

  async function deleteArea(area: Area) {
    resetMessages();

    const confirmar = window.confirm(
      `¿Estás seguro de eliminar el área "${area.nombre}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      const response = await fetch(
        `/api/areas/${area.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo eliminar el área"
        );
      }

      setMessage("Área eliminada correctamente.");

      await loadAreas();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al eliminar el área"
      );
    }
  }

  const filteredAreas = areas.filter((area) => {
    const text = search.toLowerCase();

    return (
      area.nombre.toLowerCase().includes(text) ||
      (area.descripcion || "").toLowerCase().includes(text)
    );
  });

  const activeAreas = areas.filter(
    (area) => area.estado
  ).length;

  const inactiveAreas = areas.filter(
    (area) => !area.estado
  ).length;

  const totalUsers = areas.reduce(
    (total, area) => total + area._count.users,
    0
  );

  const totalEquipment = areas.reduce(
    (total, area) => total + area._count.equipment,
    0
  );

  const messageType = message
    ? "success"
    : error
    ? "error"
    : null;

  const messageText = message || error;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">

      {/* NOTIFICACIÓN SUPERIOR */}
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

      {/* ENCABEZADO */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Áreas
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Administra las áreas de la organización.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Nueva área
        </button>
      </div>

      {/* RESUMEN */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total áreas"
          value={areas.length}
          icon={<Building2 size={20} />}
        />

        <SummaryCard
          title="Áreas activas"
          value={activeAreas}
          icon={<CheckCircle2 size={20} />}
        />

        <SummaryCard
          title="Usuarios asignados"
          value={totalUsers}
          icon={<Users size={20} />}
        />

        <SummaryCard
          title="Equipos asignados"
          value={totalEquipment}
          icon={<Monitor size={20} />}
        />
      </div>

      {/* TABLA */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* BUSCADOR */}
        <div className="border-b border-slate-200 p-4">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar área..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white text-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">
                  Área
                </th>

                <th className="px-5 py-4">
                  Descripción
                </th>

                <th className="px-5 py-4">
                  Usuarios
                </th>

                <th className="px-5 py-4">
                  Equipos
                </th>

                <th className="px-5 py-4">
                  Estado
                </th>

                <th className="px-5 py-4 text-right">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    Cargando áreas...
                  </td>
                </tr>
              ) : filteredAreas.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    No se encontraron áreas.
                  </td>
                </tr>
              ) : (
                filteredAreas.map((area) => (
                  <tr
                    key={area.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <Building2 size={18} />
                        </div>

                        <span className="font-medium text-slate-800">
                          {area.nombre}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {area.descripcion || "Sin descripción"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {area._count.users}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {area._count.equipment}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${
                          area.estado
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {area.estado
                          ? "Activa"
                          : "Inactiva"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">

                        <button
                          onClick={() =>
                            openEditModal(area)
                          }
                          title="Editar área"
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() =>
                            toggleStatus(area)
                          }
                          title={
                            area.estado
                              ? "Desactivar área"
                              : "Activar área"
                          }
                          className={`rounded-lg border p-2 transition ${
                            area.estado
                              ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {area.estado ? (
                            <XCircle size={16} />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                        </button>

                        <button
                          onClick={() =>
                            deleteArea(area)
                          }
                          title="Eliminar área"
                          className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NUEVA ÁREA */}
      {showModal && (
        <Modal
          title="Nueva área"
          subtitle="Registra una nueva área de la organización."
          onClose={closeModals}
        >
          <form
            onSubmit={createArea}
            className="space-y-5"
          >
            <Input
              label="Nombre del área"
              value={nombre}
              onChange={setNombre}
              placeholder="Ej. Recursos Humanos"
              required
            />

            <TextArea
              label="Descripción"
              value={descripcion}
              onChange={setDescripcion}
              placeholder="Descripción opcional..."
            />

            <ModalButtons
              onCancel={closeModals}
              saving={saving}
              text="Crear área"
            />
          </form>
        </Modal>
      )}

      {/* EDITAR ÁREA */}
      {showEditModal && selectedArea && (
        <Modal
          title="Editar área"
          subtitle={`Modifica la información de ${selectedArea.nombre}.`}
          onClose={closeModals}
        >
          <form
            onSubmit={updateArea}
            className="space-y-5"
          >
            <Input
              label="Nombre del área"
              value={nombre}
              onChange={setNombre}
              required
            />

            <TextArea
              label="Descripción"
              value={descripcion}
              onChange={setDescripcion}
              placeholder="Descripción opcional..."
            />

            <ModalButtons
              onCancel={closeModals}
              saving={saving}
              text="Guardar cambios"
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================
   COMPONENTES
========================================================= */

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {title}
        </span>

        <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
          {icon}
        </div>
      </div>

      <p className="text-2xl font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </div>
  );
}

function ModalButtons({
  onCancel,
  saving,
  text,
}: {
  onCancel: () => void;
  saving: boolean;
  text: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Cancelar
      </button>

      <button
        type="submit"
        disabled={saving}
        className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save size={17} />

        {saving
          ? "Guardando..."
          : text}
      </button>
    </div>
  );
}

function MessageNotification({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
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
        <div className="flex-1 text-sm font-medium">
          {message}
        </div>

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