
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  ClipboardCheck,
  Edit,
  Laptop,
  Loader2,
  Monitor,
  Plus,
  Search,
  Settings,
  Trash2,
  User,
  X,
} from "lucide-react";

type UserItem = {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  role: string;
  status: string;
};

type AreaItem = {
  id: number;
  nombre: string;
  estado: boolean;
};

type Equipment = {
  id: number;
  codigo: string;
  hostname: string;
  ip: string;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  sistemaOperativo: string | null;
  status: "ACTIVO" | "INACTIVO" | "MANTENIMIENTO" | "BAJA";
  ubicacion: string | null;
  observaciones: string | null;
  userId: number | null;
  areaId: number | null;
  user: UserItem | null;
  area: AreaItem | null;
  _count?: {
    installations: number;
    userPrograms: number;
  };
};

type FormData = {
  codigo: string;
  hostname: string;
  ip: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  sistemaOperativo: string;
  status: Equipment["status"];
  ubicacion: string;
  observaciones: string;
  userId: string;
  areaId: string;
};

const initialForm: FormData = {
  codigo: "",
  hostname: "",
  ip: "",
  marca: "",
  modelo: "",
  numeroSerie: "",
  sistemaOperativo: "",
  status: "ACTIVO",
  ubicacion: "",
  observaciones: "",
  userId: "",
  areaId: "",
};

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
        <div className="flex-1 text-sm font-medium">{message}</div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
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

function StatusBadge({
  status,
}: {
  status: Equipment["status"];
}) {
  const config = {
    ACTIVO: {
      label: "Activo",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    INACTIVO: {
      label: "Inactivo",
      className:
        "bg-slate-100 text-slate-600 border-slate-200",
    },
    MANTENIMIENTO: {
      label: "Mantenimiento",
      className:
        "bg-amber-50 text-amber-700 border-amber-200",
    },
    BAJA: {
      label: "Baja",
      className:
        "bg-red-50 text-red-700 border-red-200",
    },
  };

  const current = config[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${current.className}`}
    >
      {current.label}
    </span>
  );
}

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [usuarios, setUsuarios] = useState<UserItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Equipo al que se le está aplicando una plantilla.
  const [applyingEquipmentId, setApplyingEquipmentId] =
    useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"TODOS" | Equipment["status"]>("TODOS");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] =
    useState<Equipment | null>(null);

  const [form, setForm] = useState<FormData>(initialForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ==========================================
  // CARGAR DATOS
  // ==========================================

  async function loadData() {
    try {
      setLoading(true);

      const [equiposResponse, usuariosResponse, areasResponse] =
        await Promise.all([
          fetch("/api/equipos"),
          fetch("/api/usuarios"),
          fetch("/api/areas"),
        ]);

      const equiposData = await equiposResponse.json();
      const usuariosData = await usuariosResponse.json();
      const areasData = await areasResponse.json();

      if (!equiposResponse.ok) {
        throw new Error(
          equiposData.error || "No se pudieron cargar los equipos"
        );
      }

      if (!usuariosResponse.ok) {
        throw new Error(
          usuariosData.error || "No se pudieron cargar los usuarios"
        );
      }

      if (!areasResponse.ok) {
        throw new Error(
          areasData.error || "No se pudieron cargar las áreas"
        );
      }

      setEquipos(Array.isArray(equiposData) ? equiposData : []);
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      setAreas(Array.isArray(areasData) ? areasData : []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar los datos"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  const stats = useMemo(() => {
    return {
      total: equipos.length,

      activos: equipos.filter(
        (equipo) => equipo.status === "ACTIVO"
      ).length,

      mantenimiento: equipos.filter(
        (equipo) => equipo.status === "MANTENIMIENTO"
      ).length,

      inactivos: equipos.filter(
        (equipo) =>
          equipo.status === "INACTIVO" ||
          equipo.status === "BAJA"
      ).length,
    };
  }, [equipos]);

  // ==========================================
  // FILTRO
  // ==========================================

  const filteredEquipos = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return equipos.filter((equipo) => {
      const matchesStatus =
        statusFilter === "TODOS" ||
        equipo.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!searchText) {
        return true;
      }

      const userName = equipo.user
        ? `${equipo.user.nombres} ${equipo.user.apellidos}`
        : "";

      const areaName = equipo.area?.nombre || "";

      return [
        equipo.codigo,
        equipo.hostname,
        equipo.ip,
        equipo.marca,
        equipo.modelo,
        equipo.numeroSerie,
        equipo.sistemaOperativo,
        equipo.ubicacion,
        userName,
        areaName,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(searchText)
        );
    });
  }, [equipos, search, statusFilter]);

  // ==========================================
  // ABRIR CREAR
  // ==========================================

  function openCreateModal() {
    setEditingEquipment(null);
    setForm(initialForm);
    setMessage("");
    setError("");
    setModalOpen(true);
  }

  // ==========================================
  // ABRIR EDITAR
  // ==========================================

  function openEditModal(equipo: Equipment) {
    setEditingEquipment(equipo);

    setForm({
      codigo: equipo.codigo || "",
      hostname: equipo.hostname || "",
      ip: equipo.ip || "",
      marca: equipo.marca || "",
      modelo: equipo.modelo || "",
      numeroSerie: equipo.numeroSerie || "",
      sistemaOperativo: equipo.sistemaOperativo || "",
      status: equipo.status,
      ubicacion: equipo.ubicacion || "",
      observaciones: equipo.observaciones || "",
      userId: equipo.userId ? String(equipo.userId) : "",
      areaId: equipo.areaId ? String(equipo.areaId) : "",
    });

    setMessage("");
    setError("");
    setModalOpen(true);
  }

  // ==========================================
  // CERRAR MODAL
  // ==========================================

  function closeModal() {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingEquipment(null);
    setForm(initialForm);
  }

  // ==========================================
  // FORMULARIO
  // ==========================================

  function updateForm(field: keyof FormData, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // ==========================================
  // GUARDAR EQUIPO
  // ==========================================

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!form.codigo.trim()) {
      setError("El código del equipo es obligatorio");
      return;
    }

    if (!form.hostname.trim()) {
      setError("El hostname del equipo es obligatorio");
      return;
    }

    if (!form.ip.trim()) {
      setError("La dirección IP es obligatoria");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        codigo: form.codigo,
        hostname: form.hostname,
        ip: form.ip,
        marca: form.marca,
        modelo: form.modelo,
        numeroSerie: form.numeroSerie,
        sistemaOperativo: form.sistemaOperativo,
        status: form.status,
        ubicacion: form.ubicacion,
        observaciones: form.observaciones,
        userId: form.userId || null,
        areaId: form.areaId || null,
      };

      const url = editingEquipment
        ? `/api/equipos/${editingEquipment.id}`
        : "/api/equipos";

      const method = editingEquipment ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo guardar el equipo"
        );
      }

      const wasEditing = Boolean(editingEquipment);

      setModalOpen(false);
      setEditingEquipment(null);
      setForm(initialForm);

      await loadData();

      setMessage(
        wasEditing
          ? "Equipo actualizado correctamente"
          : "Equipo registrado correctamente"
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Error al guardar el equipo"
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // CAMBIAR ESTADO
  // ==========================================

  async function changeStatus(
    equipo: Equipment,
    status: Equipment["status"]
  ) {
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/equipos/${equipo.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo cambiar el estado"
        );
      }

      await loadData();

      setMessage(
        `El equipo ${equipo.codigo} ahora está ${getStatusLabel(
          status
        ).toLowerCase()}`
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Error al cambiar el estado"
      );
    }
  }

  // ==========================================
  // APLICAR PLANTILLA
  // ==========================================

  async function applyTemplate(equipo: Equipment) {
    setMessage("");
    setError("");

    if (applyingEquipmentId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `¿Deseas aplicar la plantilla del área "${
        equipo.area?.nombre || "sin área"
      }" al equipo "${equipo.codigo}"?\n\n` +
        "Se agregarán los programas activos que falten en el perfil del usuario. " +
        "Los programas existentes se conservarán."
    );

    if (!confirmed) {
      return;
    }

    try {
      setApplyingEquipmentId(equipo.id);

      const response = await fetch(
        `/api/equipos/${equipo.id}/aplicar-plantilla`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo aplicar la plantilla."
        );
      }

      await loadData();

      setMessage(
        `${data.mensaje} Programas agregados: ${data.agregados}. ` +
          `Ya existentes: ${data.yaExistian}.`
      );
    } catch (err) {
      console.error("Error al aplicar plantilla:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al aplicar la plantilla."
      );
    } finally {
      setApplyingEquipmentId(null);
    }
  }

  // ==========================================
  // ELIMINAR
  // ==========================================

  async function handleDelete(equipo: Equipment) {
    setMessage("");
    setError("");

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el equipo "${equipo.codigo}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/equipos/${equipo.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo eliminar el equipo"
        );
      }

      await loadData();

      setMessage("Equipo eliminado correctamente");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Error al eliminar el equipo"
      );
    }
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  function getStatusLabel(status: Equipment["status"]) {
    const labels = {
      ACTIVO: "Activo",
      INACTIVO: "Inactivo",
      MANTENIMIENTO: "Mantenimiento",
      BAJA: "Baja",
    };

    return labels[status];
  }

  const messageType = message
    ? "success"
    : error
      ? "error"
      : null;

  const messageText = message || error;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
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

      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Laptop size={26} className="text-slate-700" />

            <h1 className="text-2xl font-bold text-slate-900">
              Equipos
            </h1>
          </div>

          <p className="text-sm text-slate-500">
            Administra los equipos informáticos registrados en la
            plataforma.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Registrar equipo
        </button>
      </div>

      {/* RESUMEN */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total equipos
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {stats.total}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <Monitor size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Activos
              </p>
              <p className="mt-1 text-3xl font-bold text-emerald-600">
                {stats.activos}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <CheckCircle2 size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Mantenimiento
              </p>
              <p className="mt-1 text-3xl font-bold text-amber-600">
                {stats.mantenimiento}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <Settings size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Inactivos / Baja
              </p>
              <p className="mt-1 text-3xl font-bold text-red-600">
                {stats.inactivos}
              </p>
            </div>

            <div className="rounded-xl bg-red-50 p-3 text-red-600">
              <CircleOff size={23} />
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS */}

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por código, hostname, IP, usuario, área..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-500 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div className="relative lg:w-56">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as typeof statusFilter
                )
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
              <option value="BAJA">Baja</option>
            </select>

            <ChevronDown
              size={17}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* TABLA */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Cargando equipos...
            </div>
          </div>
        ) : filteredEquipos.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 rounded-2xl bg-slate-100 p-4 text-slate-500">
              <Laptop size={30} />
            </div>

            <h3 className="text-base font-semibold text-slate-800">
              No se encontraron equipos
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              {search || statusFilter !== "TODOS"
                ? "Prueba cambiando los filtros de búsqueda."
                : "Todavía no hay equipos registrados."}
            </p>

            {!search && statusFilter === "TODOS" && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Plus size={17} />
                Registrar primer equipo
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Equipo
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Red
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Usuario
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Área
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredEquipos.map((equipo) => (
                  <tr
                    key={equipo.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    {/* EQUIPO */}

                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {equipo.codigo}
                        </p>

                        <p className="mt-0.5 text-sm text-slate-500">
                          {equipo.hostname}
                        </p>

                        {(equipo.marca || equipo.modelo) && (
                          <p className="mt-1 text-xs text-slate-400">
                            {[equipo.marca, equipo.modelo]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* RED */}

                    <td className="px-5 py-4">
                      <p className="font-mono text-sm font-medium text-slate-700">
                        {equipo.ip}
                      </p>

                      {equipo.ubicacion && (
                        <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
                          {equipo.ubicacion}
                        </p>
                      )}
                    </td>

                    {/* USUARIO */}

                    <td className="px-5 py-4">
                      {equipo.user ? (
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                            <User size={15} />
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {equipo.user.nombres}{" "}
                              {equipo.user.apellidos}
                            </p>

                            <p className="text-xs text-slate-400">
                              @{equipo.user.username}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">
                          Sin asignar
                        </span>
                      )}
                    </td>

                    {/* ÁREA */}

                    <td className="px-5 py-4">
                      {equipo.area ? (
                        <div className="flex items-center gap-2">
                          <Building2
                            size={16}
                            className="text-slate-400"
                          />

                          <span className="text-sm font-medium text-slate-700">
                            {equipo.area.nombre}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">
                          Sin área
                        </span>
                      )}
                    </td>

                    {/* ESTADO */}

                    <td className="px-5 py-4">
                      <StatusBadge status={equipo.status} />
                    </td>

                    {/* ACCIONES */}

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        {/* APLICAR PLANTILLA */}

                        <button
                          type="button"
                          title="Aplicar plantilla del área"
                          aria-label={`Aplicar plantilla al equipo ${equipo.codigo}`}
                          onClick={() => applyTemplate(equipo)}
                          disabled={applyingEquipmentId !== null}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {applyingEquipmentId === equipo.id ? (
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <ClipboardCheck size={17} />
                          )}
                        </button>

                        {/* EDITAR */}

                        <button
                          type="button"
                          title="Editar equipo"
                          onClick={() => openEditModal(equipo)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Edit size={17} />
                        </button>

                        {/* ENVIAR A MANTENIMIENTO */}

                        {equipo.status === "ACTIVO" && (
                          <button
                            type="button"
                            title="Enviar a mantenimiento"
                            onClick={() =>
                              changeStatus(equipo, "MANTENIMIENTO")
                            }
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-600"
                          >
                            <Settings size={17} />
                          </button>
                        )}

                        {/* ACTIVAR */}

                        {equipo.status === "MANTENIMIENTO" && (
                          <button
                            type="button"
                            title="Activar equipo"
                            onClick={() => changeStatus(equipo, "ACTIVO")}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            <CheckCircle2 size={17} />
                          </button>
                        )}

                        {/* DAR DE BAJA */}

                        {equipo.status !== "BAJA" && (
                          <button
                            type="button"
                            title="Dar de baja"
                            onClick={() => changeStatus(equipo, "BAJA")}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <CircleOff size={17} />
                          </button>
                        )}

                        {/* ELIMINAR */}

                        <button
                          type="button"
                          title="Eliminar equipo"
                          onClick={() => handleDelete(equipo)}
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
        )}
      </div>

      {/* MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingEquipment
                    ? "Editar equipo"
                    : "Registrar equipo"}
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  {editingEquipment
                    ? "Actualiza la información del equipo."
                    : "Registra un nuevo equipo informático."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Cerrar formulario"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORMULARIO */}

            <form onSubmit={handleSubmit} className="overflow-y-auto">
              <div className="space-y-6 p-6">
                {/* IDENTIFICACIÓN */}

                <section>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Identificación del equipo
                    </h3>

                    <p className="text-xs text-slate-500">
                      Información principal del dispositivo.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormInput
                      label="Código"
                      required
                      value={form.codigo}
                      onChange={(value) => updateForm("codigo", value)}
                      placeholder="EQ-001"
                    />

                    <FormInput
                      label="Hostname"
                      required
                      value={form.hostname}
                      onChange={(value) => updateForm("hostname", value)}
                      placeholder="PC-ADMIN-01"
                    />

                    <FormInput
                      label="Dirección IP"
                      required
                      value={form.ip}
                      onChange={(value) => updateForm("ip", value)}
                      placeholder="192.168.1.100"
                    />

                    <FormInput
                      label="Número de serie"
                      value={form.numeroSerie}
                      onChange={(value) =>
                        updateForm("numeroSerie", value)
                      }
                      placeholder="Número de serie"
                    />

                    <FormInput
                      label="Marca"
                      value={form.marca}
                      onChange={(value) => updateForm("marca", value)}
                      placeholder="Dell, HP, Lenovo..."
                    />

                    <FormInput
                      label="Modelo"
                      value={form.modelo}
                      onChange={(value) => updateForm("modelo", value)}
                      placeholder="Modelo del equipo"
                    />

                    <FormInput
                      label="Sistema operativo"
                      value={form.sistemaOperativo}
                      onChange={(value) =>
                        updateForm("sistemaOperativo", value)
                      }
                      placeholder="Windows 11 Pro"
                    />

                    <FormInput
                      label="Ubicación"
                      value={form.ubicacion}
                      onChange={(value) =>
                        updateForm("ubicacion", value)
                      }
                      placeholder="Oficina / puesto / sede"
                    />
                  </div>
                </section>

                {/* ASIGNACIÓN */}

                <section>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Asignación
                    </h3>

                    <p className="text-xs text-slate-500">
                      Relaciona el equipo con un usuario y un área.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormSelect
                      label="Usuario"
                      value={form.userId}
                      onChange={(value) => updateForm("userId", value)}
                    >
                      <option value="">Sin usuario asignado</option>

                      {usuarios
                        .filter((usuario) => usuario.status === "ACTIVO")
                        .map((usuario) => (
                          <option key={usuario.id} value={usuario.id}>
                            {usuario.nombres} {usuario.apellidos} (@
                            {usuario.username})
                          </option>
                        ))}
                    </FormSelect>

                    <FormSelect
                      label="Área"
                      value={form.areaId}
                      onChange={(value) => updateForm("areaId", value)}
                    >
                      <option value="">Sin área asignada</option>

                      {areas
                        .filter((area) => area.estado)
                        .map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.nombre}
                          </option>
                        ))}
                    </FormSelect>
                  </div>
                </section>

                {/* ESTADO */}

                <section>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Estado
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {(
                      [
                        "ACTIVO",
                        "INACTIVO",
                        "MANTENIMIENTO",
                        "BAJA",
                      ] as Equipment["status"][]
                    ).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateForm("status", status)}
                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                          form.status === status
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                </section>

                {/* OBSERVACIONES */}

                <section>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Observaciones
                  </label>

                  <textarea
                    value={form.observaciones}
                    onChange={(event) =>
                      updateForm("observaciones", event.target.value)
                    }
                    rows={4}
                    placeholder="Observaciones adicionales del equipo..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </section>
              </div>

              {/* FOOTER */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <Loader2 size={17} className="animate-spin" />
                  )}

                  {saving
                    ? "Guardando..."
                    : editingEquipment
                      ? "Guardar cambios"
                      : "Registrar equipo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENTES DEL FORMULARIO
// ==========================================

function FormInput({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        type="text"
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
        >
          {children}
        </select>

        <ChevronDown
          size={17}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}
