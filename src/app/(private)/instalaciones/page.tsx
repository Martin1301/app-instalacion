"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  Check,
  ChevronDown,
  Clock3,
  Eye,
  Laptop,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  UserRound,
  Wrench,
  X,
} from "lucide-react";

type User = {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
  role: string;
  status: string;
};

type Equipment = {
  id: number;
  codigo: string;
  hostname: string;
  ip: string;
  marca?: string | null;
  modelo?: string | null;
  status: string;
  user?: User | null;
  area?: {
    id: number;
    nombre: string;
  } | null;
};

type Program = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  version?: string | null;
  activo: boolean;
};

type InstallationProgram = {
  id: number;
  programId: number;
  status: string;
  installed: boolean;
  configured: boolean;
  program: Program;
};

type Installation = {
  id: number;
  codigo: string;
  type: string;
  status: string;
  priority: string;
  observaciones?: string | null;
  createdAt: string;

  equipment: Equipment;

  createdBy: User;

  assignedSupport?: User | null;

  installationPrograms: InstallationProgram[];

  _count: {
    comments: number;
  };
};

type InstallationType =
  | "INSTALACION"
  | "REINSTALACION"
  | "CORRECCION"
  | "ACTUALIZACION";

type Comment = {
  id: number;
  contenido: string;
  userId: number;
  parentId: number | null;
  leido: boolean;
  createdAt: string;
  user: {
    id: number;
    nombres: string;
    apellidos: string;
    username: string;
    role: string;
  };
};

type Notification = {
  type: "success" | "error";
  message: string;
};

const installationTypeLabels: Record<
  InstallationType,
  string
> = {
  INSTALACION: "Instalación",
  REINSTALACION: "Reinstalación",
  CORRECCION: "Corrección",
  ACTUALIZACION: "Actualización",
};

const priorityLabels: Record<string, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

const statusLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ASIGNADA: "Asignada",
  EN_PROGRESO: "En progreso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

export default function InstalacionesPage() {
  const router = useRouter();
  const [installations, setInstallations] = useState<
    Installation[]
  >([]);

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [supports, setSupports] = useState<User[]>([]);

  type Role =
  | "ADMINISTRADOR"
  | "JEFE"
  | "SOPORTE"
  | "INVITADO";

const [role, setRole] = useState<Role | null>(null);
const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedEquipmentId, setSelectedEquipmentId] =
    useState("");

  const [installationType, setInstallationType] =
  useState<InstallationType>("INSTALACION");

const [availablePrograms, setAvailablePrograms] =
  useState<Program[]>([]);

const [selectedProgramIds, setSelectedProgramIds] =
  useState<number[]>([]);

const [programsLoading, setProgramsLoading] =
  useState(false);

  const [priority, setPriority] = useState("MEDIA");
  const [assignedSupportId, setAssignedSupportId] =
    useState("");

  const [observaciones, setObservaciones] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const [assignmentFilter, setAssignmentFilter] = useState<
  "TODAS" | "MÍAS"
>("TODAS");

  const [selectedInstallation, setSelectedInstallation] =
    useState<Installation | null>(null);

const [comments, setComments] = useState<Comment[]>([]);
const [commentsLoading, setCommentsLoading] = useState(false);

const [showReplyForm, setShowReplyForm] =
  useState(false);

const [replyText, setReplyText] = useState("");

const [sendingReply, setSendingReply] = useState(false);

const [cancelInstallation, setCancelInstallation] =
  useState<Installation | null>(null);

const [cancelReason, setCancelReason] = useState("");

const [canceling, setCanceling] = useState(false);

  const [notification, setNotification] =
    useState<Notification | null>(null);

  const showNotification = (
    type: "success" | "error",
    message: string
  ) => {
    setNotification({
      type,
      message,
    });

    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const loadComments = async (installationId: number) => {
  try {
    setCommentsLoading(true);

    const response = await fetch(
      `/api/instalaciones/${installationId}/comentarios`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "No se pudieron cargar los comentarios"
      );
    }

    setComments(data.comments ?? []);
  } catch (error) {
    console.error(
      "Error cargando comentarios:",
      error
    );

    showNotification(
      "error",
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los comentarios"
    );
  } finally {
    setCommentsLoading(false);
  }
};

const sendReply = async () => {
  const contenido = replyText.trim();

  if (!contenido) {
    showNotification(
      "error",
      "Escribe una respuesta antes de enviarla."
    );
    return;
  }

  if (!selectedInstallation) {
    return;
  }

  try {
    setSendingReply(true);

    const response = await fetch(
      `/api/instalaciones/${selectedInstallation.id}/comentarios`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contenido,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "No se pudo enviar la respuesta"
      );
    }

    setReplyText("");
    setShowReplyForm(false);

    await loadComments(selectedInstallation.id);

    showNotification(
      "success",
      "Comentario enviado correctamente."
    );
  } catch (error) {
    console.error(
      "Error enviando comentario:",
      error
    );

    showNotification(
      "error",
      error instanceof Error
        ? error.message
        : "No se pudo enviar el comentario"
    );
  } finally {
    setSendingReply(false);
  }
};

  const loadData = async () => {
  try {
    setLoading(true);

    // Obtener usuario actual
    const meRes = await fetch("/api/auth/me", {
      cache: "no-store",
    });

    if (!meRes.ok) {
      throw new Error("No se pudo obtener el usuario actual");
    }

    const me = await meRes.json();

    const currentRole = me.role as Role;
    setRole(currentRole);
    setCurrentUserId(Number(me.id));

    // Todos los roles pueden consultar sus instalaciones.
    const installationsRes = await fetch(
      "/api/instalaciones",
      {
        cache: "no-store",
      }
    );

    if (!installationsRes.ok) {
      throw new Error(
        "No se pudieron cargar las instalaciones"
      );
    }

    const installationsData =
      await installationsRes.json();

    setInstallations(
      Array.isArray(installationsData)
        ? installationsData
        : []
    );

    /*
     * Solamente ADMINISTRADOR y JEFE necesitan
     * estos datos porque pueden crear instalaciones.
     */
    if (
      currentRole === "ADMINISTRADOR" ||
      currentRole === "JEFE"
    ) {
      const [equipmentsRes, usersRes] =
        await Promise.all([
          fetch("/api/equipos", {
            cache: "no-store",
          }),
          fetch("/api/usuarios", {
            cache: "no-store",
          }),
        ]);

      if (!equipmentsRes.ok) {
        throw new Error(
          "No se pudieron cargar los equipos"
        );
      }

      if (!usersRes.ok) {
        throw new Error(
          "No se pudieron cargar los usuarios"
        );
      }

      const equipmentsData =
        await equipmentsRes.json();

      const usersData = await usersRes.json();

      setEquipments(
        Array.isArray(equipmentsData)
          ? equipmentsData
          : []
      );

      const supportUsers = Array.isArray(usersData)
        ? usersData.filter(
            (user: User) =>
              user.role === "SOPORTE" &&
              user.status === "ACTIVO"
          )
        : [];

      setSupports(supportUsers);
    } else {
      // SOPORTE e INVITADO no necesitan
      // cargar equipos ni usuarios.
      setEquipments([]);
      setSupports([]);
    }
  } catch (error) {
    console.error(error);

    showNotification(
      "error",
      error instanceof Error
        ? error.message
        : "No se pudieron cargar las instalaciones"
    );
  } finally {
    setLoading(false);
  }
};

const loadEquipmentPrograms = async (
  equipmentId: number
) => {
  try {
    setProgramsLoading(true);
    setAvailablePrograms([]);
    setSelectedProgramIds([]);

    const response = await fetch(
      `/api/equipos/${equipmentId}/programas`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "No se pudieron cargar los programas"
      );
    }

    const programs = Array.isArray(data.programs)
      ? data.programs
      : [];

    setAvailablePrograms(programs);

    /*
     * Por comodidad, al seleccionar un equipo
     * inicialmente dejamos todos seleccionados.
     *
     * El usuario puede quitar los que no quiera
     * incluir en esta tarea.
     */
    setSelectedProgramIds(
      programs.map((program: Program) => program.id)
    );
  } catch (error) {
    console.error(
      "Error cargando programas del equipo:",
      error
    );

    setAvailablePrograms([]);
    setSelectedProgramIds([]);

    showNotification(
      "error",
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los programas"
    );
  } finally {
    setProgramsLoading(false);
  }
};

  useEffect(() => {
    loadData();
  }, []);

  const selectedEquipment = useMemo(() => {
    return equipments.find(
      (equipment) =>
        equipment.id === Number(selectedEquipmentId)
    );
  }, [equipments, selectedEquipmentId]);

  const availableEquipments = useMemo(() => {
    /*
     * Para evitar crear varias instalaciones simultáneas
     * sobre el mismo equipo, mostramos los equipos que
     * actualmente no tienen una instalación pendiente,
     * asignada o en progreso.
     */
    const busyEquipmentIds = installations
      .filter(
        (installation) =>
          installation.status === "PENDIENTE" ||
          installation.status === "ASIGNADA" ||
          installation.status === "EN_PROGRESO"
      )
      .map((installation) => installation.equipment.id);

    return equipments.filter(
      (equipment) =>
        equipment.status !== "BAJA" &&
        equipment.user &&
        !busyEquipmentIds.includes(equipment.id)
    );
  }, [equipments, installations]);

const getProgress = (installation: Installation) => {
    const totalPrograms =
      installation.installationPrograms.length;

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

const filteredInstallations = useMemo(() => {
  const value = search.toLowerCase().trim();

  return installations.filter((installation) => {
    const progress = getProgress(installation);

    const matchesSearch =
      !value ||
      installation.codigo.toLowerCase().includes(value) ||
      installation.equipment.codigo
        .toLowerCase()
        .includes(value) ||
      installation.equipment.hostname
        .toLowerCase()
        .includes(value) ||
      installation.equipment.user?.nombres
        .toLowerCase()
        .includes(value) ||
      installation.equipment.user?.apellidos
        .toLowerCase()
        .includes(value);

    let matchesStatus = true;

    if (statusFilter === "PENDIENTE") {
      matchesStatus =
        installation.status !== "COMPLETADA" &&
        installation.status !== "CANCELADA" &&
        progress === 0;
    } else if (statusFilter === "EN_PROGRESO") {
      matchesStatus =
        installation.status !== "COMPLETADA" &&
        installation.status !== "CANCELADA" &&
        progress > 0;
    } else if (statusFilter === "COMPLETADA") {
      matchesStatus =
        installation.status === "COMPLETADA";
    } else if (statusFilter === "CANCELADA") {
      matchesStatus =
        installation.status === "CANCELADA";
    } else if (statusFilter === "ASIGNADA") {
      matchesStatus =
        installation.status === "ASIGNADA";
    } else if (statusFilter === "TODOS") {
      matchesStatus = true;
    }

    const matchesAssignment =
      assignmentFilter === "TODAS" ||
      installation.assignedSupport?.id === currentUserId;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesAssignment
    );
  });
}, [
  installations,
  search,
  statusFilter,
  assignmentFilter,
  currentUserId,
]);

  const total = installations.length;

  const myInstallations =
  role === "SOPORTE"
    ? installations.filter(
        (installation) =>
          installation.assignedSupport?.id === currentUserId
      ).length
    : 0;

  const pending = installations.filter(
  (installation) =>
    installation.status !== "COMPLETADA" &&
    installation.status !== "CANCELADA" &&
    getProgress(installation) === 0
).length;

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

  const resetModal = () => {
  setSelectedEquipmentId("");
  setInstallationType("INSTALACION");
  setAvailablePrograms([]);
  setSelectedProgramIds([]);
  setProgramsLoading(false);
  setPriority("MEDIA");
  setAssignedSupportId("");
  setObservaciones("");
};

  const openCreateModal = () => {
    resetModal();
    setModalOpen(true);
  };

  const closeCreateModal = () => {
    if (saving) return;

    setModalOpen(false);
    resetModal();
  };

const selectAllPrograms = () => {
  setSelectedProgramIds(
    availablePrograms.map((program) => program.id)
  );
};

const clearAllPrograms = () => {
  setSelectedProgramIds([]);
};

const toggleProgram = (programId: number) => {
  setSelectedProgramIds((current) =>
    current.includes(programId)
      ? current.filter((id) => id !== programId)
      : [...current, programId]
  );
};

const createInstallation = async () => {
  if (!selectedEquipmentId) {
    showNotification(
      "error",
      "Selecciona un equipo"
    );
    return;
  }

  if (!selectedEquipment?.user) {
    showNotification(
      "error",
      "El equipo debe tener un usuario asignado"
    );
    return;
  }

  if (!assignedSupportId) {
    showNotification(
      "error",
      "Debes seleccionar un usuario SOPORTE"
    );
    return;
  }

  if (selectedProgramIds.length === 0) {
    showNotification(
      "error",
      "Debes seleccionar al menos un programa"
    );
    return;
  }

  try {
    setSaving(true);

    const response = await fetch(
      "/api/instalaciones",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          equipmentId: Number(selectedEquipmentId),
          type: installationType,
          priority,
          assignedSupportId: Number(
            assignedSupportId
          ),
          programIds: selectedProgramIds,
          observaciones:
            observaciones.trim() || null,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "No se pudo crear la instalación"
      );
    }

    showNotification(
      "success",
      `Tarea ${data.installation.codigo} creada correctamente`
    );

    setModalOpen(false);
    resetModal();

    await loadData();
  } catch (error) {
    console.error(error);

    showNotification(
      "error",
      error instanceof Error
        ? error.message
        : "No se pudo crear la instalación"
    );
  } finally {
    setSaving(false);
  }
};

const cancelSelectedInstallation = async () => {
  if (!cancelInstallation) return;

  const motivo = cancelReason.trim();

  if (!motivo) {
    showNotification(
      "error",
      "Debes indicar el motivo de la cancelación"
    );
    return;
  }

  try {
    setCanceling(true);

    const response = await fetch(
      `/api/instalaciones/${cancelInstallation.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motivo,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "No se pudo cancelar la instalación"
      );
    }

    showNotification(
      "success",
      "Instalación cancelada correctamente"
    );

    setCancelInstallation(null);
    setCancelReason("");

    await loadData();
  } catch (error) {
    console.error(
      "Error cancelando instalación:",
      error
    );

    showNotification(
      "error",
      error instanceof Error
        ? error.message
        : "No se pudo cancelar la instalación"
    );
  } finally {
    setCanceling(false);
  }
};

  const getPriorityClass = (value: string) => {
    switch (value) {
      case "URGENTE":
        return "bg-red-50 text-red-700 border-red-200";

      case "ALTA":
        return "bg-orange-50 text-orange-700 border-orange-200";

      case "MEDIA":
        return "bg-blue-50 text-blue-700 border-blue-200";

      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getStatusClass = (value: string) => {
    switch (value) {
      case "COMPLETADA":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";

      case "EN_PROGRESO":
        return "bg-blue-50 text-blue-700 border-blue-200";

      case "ASIGNADA":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";

      case "PENDIENTE":
        return "bg-amber-50 text-amber-700 border-amber-200";

      case "CANCELADA":
        return "bg-red-50 text-red-700 border-red-200";

      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {notification && (
        <div
          className={`fixed right-4 top-4 z-[100] max-w-md rounded-xl border px-4 py-3 shadow-lg ${
            notification.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-start gap-3">
            {notification.type === "success" ? (
              <Check
                size={20}
                className="mt-0.5 shrink-0"
              />
            ) : (
              <X
                size={20}
                className="mt-0.5 shrink-0"
              />
            )}

            <p className="text-sm font-medium">
              {notification.message}
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Instalaciones
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Gestiona las solicitudes de instalación de software.
            </p>
          </div>

          {(role === "ADMINISTRADOR" || role === "JEFE") && (
            <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
                <Plus size={18} />
                Nueva instalación
            </button>
            )}
        </div>

        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Total
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {total}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Wrench size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Pendientes
                </p>

                <p className="mt-1 text-2xl font-bold text-amber-600">
                  {pending}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock3 size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  En proceso
                </p>

                <p className="mt-1 text-2xl font-bold text-blue-600">
                  {inProgress}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Wrench size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Completadas
                </p>

                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {completed}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Check size={21} />
              </div>
            </div>
          </div>
        </div>

        {/* FILTERS */}
<div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
  <div className="space-y-4">

    {/* FILTRO DE ASIGNACIÓN PARA SOPORTE */}
    {role === "SOPORTE" && (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Asignación
          </p>
          <p className="text-xs text-slate-500">
            Filtra las instalaciones asignadas a ti.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setAssignmentFilter("TODAS")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              assignmentFilter === "TODAS"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Todas
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAssignmentFilter("MÍAS")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              assignmentFilter === "MÍAS"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Mis instalaciones
            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
              {myInstallations}
            </span>
          </button>
        </div>
      </div>
    )}

    {/* BÚSQUEDA Y ESTADO */}
    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Buscar por código, equipo, hostname o usuario..."
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="relative">
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-400"
        >
          <option value="TODOS">
            Todos los estados
          </option>

          <option value="PENDIENTE">
            Pendiente
          </option>

          <option value="EN_PROGRESO">
            En progreso
          </option>

          <option value="COMPLETADA">
            Completada
          </option>

          <option value="CANCELADA">
            Cancelada
          </option>
        </select>

        <ChevronDown
          size={17}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  </div>
</div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <Loader2
                size={28}
                className="animate-spin text-blue-600"
              />
            </div>
          ) : filteredInstallations.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Wrench size={26} />
              </div>

              <h3 className="font-semibold text-slate-800">
                No hay instalaciones
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                No existen instalaciones que coincidan con los
                filtros actuales.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Instalación
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Equipo
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Usuario
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Soporte
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Progreso
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Estado
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredInstallations.map(
                      (installation) => {
                        const progress =
                          getProgress(installation);

                        return (
                          <tr
                            key={installation.id}
                            className={`transition hover:bg-slate-50 ${
                                role === "SOPORTE" &&
                                installation.assignedSupport?.id === currentUserId
                                ? "bg-blue-50/40"
                                : ""
                            }`}
                            >
                            <td className="px-5 py-4">
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {installation.codigo}
                                </p>

                                <span
                                  className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getPriorityClass(
                                    installation.priority
                                  )}`}
                                >
                                  {
                                    priorityLabels[
                                      installation.priority
                                    ]
                                  }
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-slate-800">
                                {
                                  installation.equipment
                                    .codigo
                                }
                              </p>

                              <p className="text-xs text-slate-500">
                                {
                                  installation.equipment
                                    .hostname
                                }
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              {installation.equipment.user ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                    {installation.equipment.user.nombres.charAt(
                                      0
                                    )}
                                    {installation.equipment.user.apellidos.charAt(
                                      0
                                    )}
                                  </div>

                                  <div>
                                    <p className="text-sm font-medium text-slate-800">
                                      {
                                        installation.equipment
                                          .user.nombres
                                      }{" "}
                                      {
                                        installation.equipment
                                          .user.apellidos
                                      }
                                    </p>

                                    <p className="text-xs text-slate-400">
                                      {
                                        installation.equipment
                                          .user.username
                                      }
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400">
                                  Sin usuario
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {installation.assignedSupport ? (
                                <div>
                                  <p className="text-sm font-medium text-slate-800">
                                    {
                                      installation
                                        .assignedSupport.nombres
                                    }{" "}
                                    {
                                      installation
                                        .assignedSupport
                                        .apellidos
                                    }
                                  </p>

                                  <p className="text-xs text-slate-400">
                                    {
                                      installation
                                        .assignedSupport
                                        .username
                                    }
                                  </p>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400">
                                  Sin asignar
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <div className="w-32">
                                <div className="mb-1 flex justify-between text-xs">
                                  <span className="text-slate-500">
                                    {
                                      installation
                                        .installationPrograms
                                        .length
                                    }{" "}
                                    programas
                                  </span>

                                  <span className="font-semibold text-slate-700">
                                    {progress}%
                                  </span>
                                </div>

                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-blue-600 transition-all"
                                    style={{
                                      width: `${progress}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(
                                  installation.status
                                )}`}
                              >
                                {
                                  statusLabels[
                                    installation.status
                                  ]
                                }
                              </span>
                            </td>

<td className="px-5 py-4 text-right">
 <div className="flex items-center justify-end gap-2">
  {role === "SOPORTE" &&
  installation.assignedSupport?.id === currentUserId &&
  (installation.status === "ASIGNADA" ||
    installation.status === "EN_PROGRESO") ? (
    <button
      type="button"
      onClick={() =>
        router.push(
          `/instalaciones/${installation.id}`
        )
      }
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
    >
      <Wrench size={15} />
      Realizar instalación
    </button>
  ) : installation.status === "COMPLETADA" ? (
    <button
      type="button"
      onClick={() =>
        router.push(
          `/instalaciones/${installation.id}`
        )
      }
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
    >
      <Eye size={15} />
      Ver instalación completa
    </button>
  ) : (
    <button
      type="button"
      onClick={() => {
        setSelectedInstallation(installation);
        loadComments(installation.id);
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
      title="Ver detalle"
    >
      <Eye size={18} />
    </button>
  )}
</div>
</td>

                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE / TABLET */}
              <div className="grid gap-3 p-3 lg:hidden">
                {filteredInstallations.map(
                  (installation) => {
                    const progress =
                      getProgress(installation);

                    return (
                      <div
                        key={installation.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {installation.codigo}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                installation.equipment
                                  .codigo
                              }{" "}
                              ·{" "}
                              {
                                installation.equipment
                                  .hostname
                              }
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${getStatusClass(
                              installation.status
                            )}`}
                          >
                            {
                              statusLabels[
                                installation.status
                              ]
                            }
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-400">
                              Usuario
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {installation.equipment.user
                                ? `${installation.equipment.user.nombres} ${installation.equipment.user.apellidos}`
                                : "Sin usuario"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Soporte
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {installation.assignedSupport
                                ? `${installation.assignedSupport.nombres} ${installation.assignedSupport.apellidos}`
                                : "Sin asignar"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-slate-500">
                              Progreso
                            </span>

                            <span className="font-semibold text-slate-700">
                              {progress}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>
                        </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
  <span
    className={`rounded-full border px-2 py-1 text-[11px] font-medium ${getPriorityClass(
      installation.priority
    )}`}
  >
    {priorityLabels[installation.priority]}
  </span>

  <div className="flex items-center gap-2">
  {role === "SOPORTE" &&
  installation.assignedSupport?.id === currentUserId &&
  (installation.status === "ASIGNADA" ||
    installation.status === "EN_PROGRESO") ? (
    <button
      type="button"
      onClick={() =>
        router.push(
          `/instalaciones/${installation.id}`
        )
      }
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
    >
      <Wrench size={15} />
      Realizar instalación
    </button>
  ) : (
    <button
      type="button"
      onClick={() =>
        setSelectedInstallation(installation)
      }
      className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-600"
    >
      <Eye size={15} />
      Ver detalle
    </button>
  )}

  {(role === "ADMINISTRADOR" ||
    role === "JEFE") &&
    installation.status !== "COMPLETADA" &&
    installation.status !== "CANCELADA" && (
      <button
        type="button"
        onClick={() => {
          setCancelInstallation(installation);
          setCancelReason("");
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
        title="Cancelar instalación"
      >
        <Ban size={17} />
      </button>
    )}
</div>
</div>

                      </div>
                    );
                  }
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL CREAR */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Nueva instalación
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  El checklist se generará desde el perfil de programas.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {/* EQUIPO */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Equipo
                </label>

                <div className="relative">
                  <Laptop
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={selectedEquipmentId}
                    onChange={(event) => {
                    const value = event.target.value;

                    setSelectedEquipmentId(value);

                    if (value) {
                      loadEquipmentPrograms(Number(value));
                    } else {
                      setAvailablePrograms([]);
                      setSelectedProgramIds([]);
                    }
                  }}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-500" 
                  >
                    <option value="">
                      Seleccionar equipo
                    </option>

                    {availableEquipments.map(
                      (equipment) => (
                        <option
                          key={equipment.id}
                          value={equipment.id}
                        >
                          {equipment.codigo} —{" "}
                          {equipment.hostname}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                {availableEquipments.length === 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertCircle size={14} />
                    No hay equipos disponibles para una nueva instalación.
                  </p>
                )}
              </div>

              {/* INFO EQUIPO */}
              {selectedEquipment && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <MonitorIcon />
                    <p className="text-sm font-semibold text-blue-900">
                      Información del equipo
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-blue-600">
                        Usuario
                      </p>

                      <p className="mt-1 text-sm font-semibold text-blue-950">
                        {selectedEquipment.user
                          ? `${selectedEquipment.user.nombres} ${selectedEquipment.user.apellidos}`
                          : "Sin usuario"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-blue-600">
                        IP
                      </p>

                      <p className="mt-1 text-sm font-semibold text-blue-950">
                        {selectedEquipment.ip}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-blue-600">
                        Área
                      </p>

                      <p className="mt-1 text-sm font-semibold text-blue-950">
                        {selectedEquipment.area?.nombre ||
                          "Sin área"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-blue-600">
                        Equipo
                      </p>

                      <p className="mt-1 text-sm font-semibold text-blue-950">
                        {selectedEquipment.marca || "—"}{" "}
                        {selectedEquipment.modelo || ""}
                      </p>
                    </div>
                  </div>
                </div>
              )}

                {/* TIPO DE TAREA */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Tipo de tarea
                  </label>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(
                      Object.entries(
                        installationTypeLabels
                      ) as [InstallationType, string][]
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setInstallationType(value)
                        }
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                          installationType === value
                            ? "border-blue-300 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Define qué tipo de trabajo se realizará sobre los
                    programas seleccionados.
                  </p>
                </div>

              {/* PROGRAMAS */}
              <div>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Programas a trabajar
                    </label>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Selecciona únicamente los programas que
                      formarán parte de esta tarea.
                    </p>
                  </div>

                  {availablePrograms.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllPrograms}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Seleccionar todos
                      </button>

                      <span className="text-slate-300">
                        |
                      </span>

                      <button
                        type="button"
                        onClick={clearAllPrograms}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Limpiar
                      </button>
                    </div>
                  )}
                </div>

                {!selectedEquipmentId ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <Laptop
                      size={24}
                      className="mx-auto mb-2 text-slate-300"
                    />

                    <p className="text-sm font-medium text-slate-500">
                      Selecciona primero un equipo
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Aquí aparecerán los programas disponibles
                      para ese equipo.
                    </p>
                  </div>
                ) : programsLoading ? (
                  <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2
                        size={18}
                        className="animate-spin text-blue-600"
                      />
                      Cargando programas...
                    </div>
                  </div>
                ) : availablePrograms.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-6 text-center">
                    <AlertCircle
                      size={24}
                      className="mx-auto mb-2 text-amber-500"
                    />

                    <p className="text-sm font-semibold text-amber-700">
                      No hay programas disponibles
                    </p>

                    <p className="mt-1 text-xs text-amber-600">
                      El usuario de este equipo no tiene programas
                      definidos en su perfil.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {selectedProgramIds.length} de{" "}
                        {availablePrograms.length} seleccionados
                      </span>

                      {selectedProgramIds.length === 0 && (
                        <span className="text-xs font-medium text-amber-600">
                          Selecciona al menos uno
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                      {availablePrograms.map((program) => {
                        const selected =
                          selectedProgramIds.includes(
                            program.id
                          );

                        return (
                          <label
                            key={program.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                              selected
                                ? "border-blue-200 bg-blue-50"
                                : "border-transparent hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() =>
                                toggleProgram(program.id)
                              }
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-800">
                                  {program.nombre}
                                </p>

                                {program.version && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                    v{program.version}
                                  </span>
                                )}
                              </div>

                              {program.descripcion && (
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  {program.descripcion}
                                </p>
                              )}
                            </div>

                            {selected && (
                              <Check
                                size={18}
                                className="mt-0.5 shrink-0 text-blue-600"
                              />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* PRIORIDAD */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Prioridad
                </label>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(priorityLabels).map(
                    ([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setPriority(value)
                        }
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                          priority === value
                            ? getPriorityClass(value) +
                              " ring-2 ring-blue-100"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* SOPORTE */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Asignar a soporte
                </label>

                <div className="relative">
                  <UserRound
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={assignedSupportId}
                    onChange={(event) =>
                      setAssignedSupportId(
                        event.target.value
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-500"
                  >
                    <option value="">
                    Seleccionar soporte
                    </option>

                    {supports.map((support) => (
                      <option
                        key={support.id}
                        value={support.id}
                      >
                        {support.nombres}{" "}
                        {support.apellidos} — @
                        {support.username}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                {supports.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    No existen usuarios SOPORTE activos.
                  </p>
                )}
              </div>

              {/* OBSERVACIONES */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Observaciones
                </label>

                <textarea
                  value={observaciones}
                  onChange={(event) =>
                    setObservaciones(
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Indicaciones adicionales para soporte..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-500"
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex gap-3">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-blue-600"
                />

                <p className="text-xs leading-5 text-blue-800">
                  La tarea se creará únicamente con los programas
                  seleccionados. Esto permite crear, por ejemplo,
                  una reinstalación de un solo programa sin modificar
                  el historial de las instalaciones anteriores.
                </p>
              </div>
            </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-5 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                disabled={saving}
                onClick={closeCreateModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                saving ||
                !selectedEquipmentId ||
                !assignedSupportId ||
                selectedProgramIds.length === 0
                }
                onClick={createInstallation}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Crear instalación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CANCELAR INSTALACIÓN */}
{cancelInstallation && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Cancelar instalación
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            {cancelInstallation.codigo}
          </p>
        </div>

        <button
          type="button"
          disabled={canceling}
          onClick={() => {
            setCancelInstallation(null);
            setCancelReason("");
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        >
          <X size={19} />
        </button>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex gap-3">
            <Ban
              size={20}
              className="mt-0.5 shrink-0 text-red-500"
            />

            <div>
              <p className="text-sm font-semibold text-red-800">
                ¿Estás seguro de cancelar esta instalación?
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                La instalación pasará al estado
                <strong> CANCELADA </strong>
                y ya no podrá continuar con el proceso
                de instalación.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Motivo de cancelación
          </label>

          <textarea
            value={cancelReason}
            onChange={(event) =>
              setCancelReason(event.target.value)
            }
            placeholder="Escribe el motivo por el cual se cancela esta instalación..."
            rows={4}
            maxLength={500}
            disabled={canceling}
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-slate-50"
          />

          <div className="mt-1 flex justify-end">
            <span className="text-[11px] text-slate-400">
              {cancelReason.length}/500
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-5 sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          disabled={canceling}
          onClick={() => {
            setCancelInstallation(null);
            setCancelReason("");
          }}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Volver
        </button>

        <button
          type="button"
          disabled={
            canceling ||
            !cancelReason.trim()
          }
          onClick={cancelSelectedInstallation}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {canceling ? (
            <>
              <Loader2
                size={17}
                className="animate-spin"
              />
              Cancelando...
            </>
          ) : (
            <>
              <Ban size={17} />
              Cancelar instalación
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}

      {/* MODAL DETALLE */}
      {selectedInstallation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedInstallation.codigo}
                </h2>

                <p className="text-xs text-slate-500">
                  Detalle de la instalación
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedInstallation(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Equipo
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {
                      selectedInstallation.equipment
                        .codigo
                    }
                  </p>

                  <p className="text-xs text-slate-500">
                    {
                      selectedInstallation.equipment
                        .hostname
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Usuario
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedInstallation.equipment.user
                      ? `${selectedInstallation.equipment.user.nombres} ${selectedInstallation.equipment.user.apellidos}`
                      : "Sin usuario"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Soporte asignado
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedInstallation.assignedSupport
                      ? `${selectedInstallation.assignedSupport.nombres} ${selectedInstallation.assignedSupport.apellidos}`
                      : "Sin asignar"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Prioridad
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getPriorityClass(
                      selectedInstallation.priority
                    )}`}
                  >
                    {
                      priorityLabels[
                        selectedInstallation.priority
                      ]
                    }
                  </span>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Checklist de programas
                    </h3>

                    <p className="text-xs text-slate-500">
                      Programas incluidos en el perfil.
                    </p>
                  </div>

                  <span className="text-sm font-bold text-blue-600">
                    {getProgress(selectedInstallation)}%
                  </span>
                </div>

                <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width: `${getProgress(
                        selectedInstallation
                      )}%`,
                    }}
                  />
                </div>

                <div className="space-y-2">
                  {selectedInstallation.installationPrograms.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                              item.installed &&
                              item.configured
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.installed &&
                            item.configured ? (
                              <Check size={18} />
                            ) : (
                              <Wrench size={18} />
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {item.program.nombre}
                            </p>

                            <p className="text-xs text-slate-500">
                              {item.status ===
                              "CONFIGURADO"
                                ? "Instalado y configurado"
                                : item.status ===
                                  "INSTALADO"
                                ? "Instalado"
                                : item.status ===
                                  "INSTALANDO"
                                ? "Instalando"
                                : "Pendiente"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                            item.installed &&
                            item.configured
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.installed &&
                          item.configured
                            ? "Completado"
                            : "Pendiente"}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {selectedInstallation.observaciones && (
                <div>
                  <h3 className="mb-2 font-semibold text-slate-900">
                    Observaciones
                  </h3>

                  <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    {selectedInstallation.observaciones}
                  </div>
                </div>
              )}

              {/* COMENTARIOS */}
<div className="border-t border-slate-200 pt-6">
  <div className="mb-4 flex items-center justify-between">
    <div>
      <div className="flex items-center gap-2">
        <MessageSquare
          size={18}
          className="text-blue-600"
        />

        <h3 className="font-semibold text-slate-900">
          Comentarios
        </h3>

        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
          {selectedInstallation._count.comments}
        </span>
      </div>

      <p className="mt-1 text-xs text-slate-500">
        Comunicación sobre esta instalación.
      </p>
    </div>
  </div>

  {commentsLoading ? (
    <div className="flex items-center justify-center rounded-xl border border-slate-200 p-8">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2
          size={18}
          className="animate-spin text-blue-600"
        />
        Cargando comentarios...
      </div>
    </div>
  ) : comments.length === 0 ? (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <MessageSquare
        size={24}
        className="mx-auto mb-2 text-slate-300"
      />

      <p className="text-sm font-medium text-slate-500">
        Todavía no hay comentarios.
      </p>

      <p className="mt-1 text-xs text-slate-400">
        No se han registrado comentarios para esta instalación.
      </p>
    </div>
  ) : (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          {/* COMENTARIO PRINCIPAL */}
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              {comment.user.nombres.charAt(0)}
              {comment.user.apellidos.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  {comment.user.nombres}{" "}
                  {comment.user.apellidos}
                </p>

                <span className="text-[11px] text-slate-400">
                  @{comment.user.username}
                </span>

                <span className="text-[11px] text-slate-400">
                  ·{" "}
                  {new Date(
                    comment.createdAt
                  ).toLocaleString("es-PE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {comment.contenido}
              </p>

              {/* RESPONDER */}
              

              {/* CAMPO DE RESPUESTA */}
              

              {/* RESPUESTAS */}
            </div>
          </div>
        </div>
      ))}

        {selectedInstallation.status !== "COMPLETADA" &&
  selectedInstallation.status !== "CANCELADA" && (
    <div className="mt-6 border-t border-slate-100 pt-5">
      {!showReplyForm ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setShowReplyForm(true);
              setReplyText("");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <MessageSquare size={16} />
            Responder
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Escribe tu respuesta
            </p>

            <button
              type="button"
              onClick={() => {
                setShowReplyForm(false);
                setReplyText("");
              }}
              disabled={sendingReply}
              className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>

          <textarea
            value={replyText}
            onChange={(event) =>
              setReplyText(event.target.value)
            }
            rows={4}
            maxLength={2000}
            placeholder="Escribe tu respuesta..."
            disabled={sendingReply}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {replyText.length}/2000
            </span>

            <button
              type="button"
              onClick={sendReply}
              disabled={
                sendingReply ||
                !replyText.trim()
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingReply ? (
                <>
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageSquare size={14} />
                  Enviar respuesta
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )}

    </div>
  )}
</div>

<div className="border-t border-slate-100 pt-4">
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <MessageSquare size={15} />

      {selectedInstallation._count.comments}{" "}
      comentarios
    </div>

    {selectedInstallation.status === "COMPLETADA" && (
      <button
        type="button"
        onClick={() => {
          const installationId =
            selectedInstallation.id;

          setSelectedInstallation(null);

          router.push(
            `/instalaciones/${installationId}`
          );
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
      >
        Ver instalación completa
      </button>
    )}
  </div>
</div>

            </div>
          </div>
         </div>
      )}
    </div>
  );
}

function MonitorIcon() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
      <Laptop size={17} />
    </div>
  );
}