"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Laptop,
  Loader2,
  MessageSquare,
  Save,
  Settings2,
  User,
  XCircle,
} from "lucide-react";

type ProgramStatus =
  | "PENDIENTE"
  | "INSTALANDO"
  | "INSTALADO"
  | "CONFIGURADO";

type InstallationProgram = {
  id: number;
  programId: number;
  status: ProgramStatus;
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

type Installation = {
  id: number;
  codigo: string;
  status:
    | "PENDIENTE"
    | "ASIGNADA"
    | "EN_PROGRESO"
    | "COMPLETADA"
    | "CANCELADA";
  priority: "BAJA" | "MEDIA" | "ALTA" | "URGENTE";

  equipment: {
    id: number;
    codigo: string;
    hostname: string;
    ip: string;
    marca: string | null;
    modelo: string | null;
    numeroSerie: string | null;
    sistemaOperativo: string | null;
    ubicacion: string | null;
    user: {
      id: number;
      nombres: string;
      apellidos: string;
      username: string;
      email: string | null;
    } | null;
    area: {
      id: number;
      nombre: string;
    } | null;
  };

  createdBy: {
  id: number;
  nombres: string;
  apellidos: string;
  username: string;
} | null;

  assignedSupport: {
    id: number;
    nombres: string;
    apellidos: string;
    username: string;
  } | null;

  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;

  finalComment: string | null;
  observaciones: string | null;

  installationPrograms: InstallationProgram[];

  comments: {
    id: number;
  }[];
};

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
  replies: Comment[];
};

type Notification = {
  type: "success" | "error";
  message: string;
};

const priorityLabels: Record<Installation["priority"], string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

const statusLabels: Record<Installation["status"], string> = {
  PENDIENTE: "Pendiente",
  ASIGNADA: "Asignada",
  EN_PROGRESO: "En progreso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

const programStatusLabels: Record<ProgramStatus, string> = {
  PENDIENTE: "Pendiente",
  INSTALANDO: "Instalando",
  INSTALADO: "Instalado",
  CONFIGURADO: "Configurado",
};

function formatDate(date: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusClasses(status: Installation["status"]) {
  switch (status) {
    case "COMPLETADA":
      return "bg-emerald-100 text-emerald-700";
    case "EN_PROGRESO":
      return "bg-blue-100 text-blue-700";
    case "ASIGNADA":
      return "bg-violet-100 text-violet-700";
    case "CANCELADA":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function getPriorityClasses(priority: Installation["priority"]) {
  switch (priority) {
    case "URGENTE":
      return "bg-red-100 text-red-700";
    case "ALTA":
      return "bg-orange-100 text-orange-700";
    case "MEDIA":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getProgramStatusClasses(status: ProgramStatus) {
  switch (status) {
    case "CONFIGURADO":
      return "bg-emerald-100 text-emerald-700";
    case "INSTALADO":
      return "bg-blue-100 text-blue-700";
    case "INSTALANDO":
      return "bg-violet-100 text-violet-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function normalizeInstallation(data: any): Installation {
  const raw = data?.installation ?? data;

  return {
    ...raw,

    equipment: raw?.equipment ?? {
      id: 0,
      codigo: "—",
      hostname: "—",
      ip: "—",
      marca: null,
      modelo: null,
      numeroSerie: null,
      sistemaOperativo: null,
      ubicacion: null,
      user: null,
      area: null,
    },

    createdBy: raw?.createdBy ?? null,

    assignedSupport: raw?.assignedSupport ?? null,

    installationPrograms: Array.isArray(raw?.installationPrograms)
      ? raw.installationPrograms
      : [],

    comments: Array.isArray(raw?.comments)
      ? raw.comments
      : [],

    finalComment: raw?.finalComment ?? null,

    observaciones: raw?.observaciones ?? null,
  };
}

export default function InstallationDetailPage() {

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
const [replyText, setReplyText] = useState("");
const [sendingComment, setSendingComment] = useState(false);
const [sendingReply, setSendingReply] = useState(false);

  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [installation, setInstallation] = useState<Installation | null>(null);
  const [accessError, setAccessError] =
  useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProgram, setSavingProgram] = useState<number | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [notification, setNotification] =
    useState<Notification | null>(null);

  const [programDrafts, setProgramDrafts] = useState<
    Record<
      number,
      {
        installed: boolean;
        configured: boolean;
        observaciones: string;
      }
    >
  >({});

  const [finalComment, setFinalComment] = useState("");

  useEffect(() => {
    loadInstallation();
    loadComments();
  }, [id]);

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [notification]);

async function loadInstallation() {
  try {
    setLoading(true);
    setAccessError(null);

    const response = await fetch(
      `/api/instalaciones/${id}`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (response.status === 403) {
      setInstallation(null);

      setAccessError(
        data.message ||
          "No tienes permisos para consultar esta instalación."
      );

      return;
    }

    if (response.status === 404) {
      setInstallation(null);

      setAccessError(
        data.message ||
          "La instalación no existe."
      );

      return;
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          "No se pudo cargar la instalación."
      );
    }

    setInstallation(data);

    const drafts: Record<
      number,
      {
        installed: boolean;
        configured: boolean;
        observaciones: string;
      }
    > = {};

    for (
      const item of data.installationPrograms ?? []
    ) {
      drafts[item.id] = {
        installed: item.installed,
        configured: item.configured,
        observaciones:
          item.observaciones ?? "",
      };
    }

    setProgramDrafts(drafts);

    setFinalComment(
      data.finalComment ?? ""
    );
  } catch (error) {
    console.error(
      "Error cargando instalación:",
      error
    );

    setAccessError(
      error instanceof Error
        ? error.message
        : "No se pudo cargar la instalación."
    );
  } finally {
    setLoading(false);
  }
}

async function loadComments() {
  try {
    const response = await fetch(
      `/api/instalaciones/${id}/comentarios`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "No se pudieron cargar los comentarios"
      );
    }

    setComments(
      Array.isArray(data.comments)
        ? data.comments
        : []
    );
  } catch (error) {
    setNotification({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los comentarios",
    });
  }
}

async function sendComment() {
  const contenido = commentText.trim();

  if (!contenido) {
    setNotification({
      type: "error",
      message: "Escribe un comentario antes de enviarlo.",
    });
    return;
  }

  try {
    setSendingComment(true);

    const response = await fetch(
      `/api/instalaciones/${id}/comentarios`,
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
          "No se pudo enviar el comentario"
      );
    }

    setCommentText("");

    await loadComments();

    setNotification({
      type: "success",
      message: "Comentario agregado correctamente.",
    });
  } catch (error) {
    setNotification({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo enviar el comentario",
    });
  } finally {
    setSendingComment(false);
  }
}

async function sendReply() {
  const contenido = replyText.trim();

  if (!contenido) {
    setNotification({
      type: "error",
      message: "Escribe una respuesta antes de enviarla.",
    });
    return;
  }

  if (replyingTo === null) {
    setNotification({
      type: "error",
      message: "No hay una conversación seleccionada.",
    });
    return;
  }

  try {
    setSendingReply(true);

    const response = await fetch(
      `/api/instalaciones/${id}/comentarios`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contenido,
          parentId: replyingTo,
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
    setReplyingTo(null);

    await loadComments();

    setNotification({
      type: "success",
      message: "Respuesta enviada correctamente.",
    });
  } catch (error) {
    setNotification({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo enviar la respuesta",
    });
  } finally {
    setSendingReply(false);
  }
}

  function updateDraft(
    programId: number,
    field:
      | "installed"
      | "configured"
      | "observaciones",
    value: boolean | string
  ) {
    setProgramDrafts((current) => ({
      ...current,
      [programId]: {
        ...current[programId],
        [field]: value,
      },
    }));
  }

  async function saveProgram(program: InstallationProgram) {
    const draft = programDrafts[program.id];

    if (!draft) return;

    if (draft.configured && !draft.installed) {
      setNotification({
        type: "error",
        message:
          "Un programa no puede marcarse como configurado si todavía no está instalado.",
      });
      return;
    }

    try {
      setSavingProgram(program.id);

      const response = await fetch(
        `/api/instalaciones/${id}/programas/${program.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            installed: draft.installed,
            configured: draft.configured,
            observaciones: draft.observaciones,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "No se pudo actualizar el programa"
        );
      }

      // Después de guardar, volvemos a cargar la instalación completa.
// Esto garantiza que installationPrograms siempre esté disponible.
const installationResponse = await fetch(
  `/api/instalaciones/${id}`
);

const installationData = await installationResponse.json();

if (!installationResponse.ok) {
  throw new Error(
    installationData.message ||
      "El programa se guardó, pero no se pudo actualizar la vista."
  );
}

const updatedInstallation = normalizeInstallation(installationData);

setInstallation(updatedInstallation);

const updatedDrafts: Record<
  number,
  {
    installed: boolean;
    configured: boolean;
    observaciones: string;
  }
> = {};

for (const item of updatedInstallation.installationPrograms) {
  updatedDrafts[item.id] = {
    installed: item.installed ?? false,
    configured: item.configured ?? false,
    observaciones: item.observaciones ?? "",
  };
}

setProgramDrafts(updatedDrafts);
setFinalComment(updatedInstallation.finalComment ?? "");updatedInstallation

for (const item of updatedInstallation.installationPrograms ?? []) {
  updatedDrafts[item.id] = {
    installed: item.installed,
    configured: item.configured,
    observaciones: item.observaciones ?? "",
  };
}

setProgramDrafts(updatedDrafts);

      setNotification({
        type: "success",
        message: `Programa "${program.program.nombre}" actualizado correctamente.`,
      });
    } catch (error) {
      setNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el programa",
      });
    } finally {
      setSavingProgram(null);
    }
  }

  const progress = useMemo(() => {
  if (!installation) return 0;

  const programs = Array.isArray(
    installation.installationPrograms
  )
    ? installation.installationPrograms
    : [];

  if (programs.length === 0) {
    return 0;
  }

  const completed = programs.filter((program) => {
    const draft = programDrafts[program.id];

    return (
      draft?.installed === true &&
      draft?.configured === true
    );
  }).length;

  return Math.round((completed / programs.length) * 100);
}, [installation, programDrafts]);

  const pendingPrograms = useMemo(() => {
  if (!installation) return [];

  const programs = Array.isArray(
    installation.installationPrograms
  )
    ? installation.installationPrograms
    : [];

  return programs.filter((program) => {
    const draft = programDrafts[program.id];

    return !draft?.installed || !draft?.configured;
  });
}, [installation, programDrafts]);

  const hasUnsavedChanges = useMemo(() => {
    if (!installation) return false;

    return installation.installationPrograms.some((program) => {
      const draft = programDrafts[program.id];

      if (!draft) return false;

      return (
        draft.installed !== program.installed ||
        draft.configured !== program.configured ||
        draft.observaciones !== (program.observaciones ?? "")
      );
    });
  }, [installation, programDrafts]);

  const canFinalize =
    !!installation &&
    installation.status !== "COMPLETADA" &&
    installation.status !== "CANCELADA" &&
    installation.installationPrograms.length > 0 &&
    pendingPrograms.length === 0 &&
    !hasUnsavedChanges &&
    savingProgram === null;

  async function finalizeInstallation() {
  if (!installation) return;

  if (!canFinalize) {
    setNotification({
      type: "error",
      message: hasUnsavedChanges
        ? "Guarda los cambios de los programas antes de finalizar la instalación."
        : "No puedes finalizar la instalación mientras existan programas pendientes.",
    });
    return;
  }

  try {
    setFinalizing(true);

    const response = await fetch(
      `/api/instalaciones/${id}/finalizar`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          finalComment: finalComment.trim(),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      let message =
        data.message || "No se pudo finalizar la instalación.";

      if (Array.isArray(data.pendingPrograms)) {
        message += ` Pendientes: ${data.pendingPrograms.join(", ")}.`;
      }

      throw new Error(message);
    }

    /*
     * El endpoint de finalizar puede devolver la instalación
     * actualizada sin todas sus relaciones.
     *
     * Por eso volvemos a consultar el detalle completo.
     */
    const installationResponse = await fetch(
      `/api/instalaciones/${id}`
    );

    const installationData = await installationResponse.json();

    if (!installationResponse.ok) {
      throw new Error(
        installationData.message ||
          "La instalación fue finalizada, pero no se pudo actualizar la vista."
      );
    }

    const updatedInstallation = normalizeInstallation(installationData);

    setInstallation(updatedInstallation);

    /*
     * Sincronizamos también los estados de los programas.
     */
    const updatedDrafts: Record<
      number,
      {
        installed: boolean;
        configured: boolean;
        observaciones: string;
      }
    > = {};

    for (
      const item of updatedInstallation.installationPrograms ?? []
    ) {
      updatedDrafts[item.id] = {
        installed: item.installed,
        configured: item.configured,
        observaciones: item.observaciones ?? "",
      };
    }

    setProgramDrafts(updatedDrafts);

    setNotification({
      type: "success",
      message: "La instalación fue finalizada correctamente.",
    });
  } catch (error) {
    setNotification({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo finalizar la instalación",
    });
  } finally {
    setFinalizing(false);
  }
}

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-sm">
          <Loader2 className="animate-spin text-blue-600" size={22} />
          <span className="text-sm font-medium text-slate-600">
            Cargando instalación...
          </span>
        </div>
      </div>
    );
  }

  if (!installation) {
  return (
    <div className="p-6 lg:p-8">
      <button
        type="button"
        onClick={() =>
          router.push("/instalaciones")
        }
        className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={18} />
        Volver a instalaciones
      </button>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        {accessError ||
          "No se pudo cargar la instalación."}
      </div>
    </div>
  );
}

  const isFinished =
    installation.status === "COMPLETADA" ||
    installation.status === "CANCELADA";

  function renderReplyForm() {
  return (
    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800 m-l">
            Responder
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Escribe tu respuesta en este hilo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setReplyingTo(null);
            setReplyText("");
          }}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>

      <textarea
        value={replyText}
        onChange={(event) =>
          setReplyText(event.target.value)
        }
        placeholder="Escribe tu respuesta..."
        rows={4}
        maxLength={2000}
        autoFocus
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {replyText.length}/2000
        </span>

        <button
          type="button"
          disabled={
            sendingReply ||
            !replyText.trim()
          }
          onClick={sendReply}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sendingReply ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4" />
              Enviar respuesta
            </>
          )}
        </button>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {notification && (
        <div className="fixed right-5 top-5 z-50 max-w-sm">
          <div
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
              notification.type === "success"
                ? "border-emerald-200 bg-white text-emerald-700"
                : "border-red-200 bg-white text-red-700"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={20} className="mt-0.5 shrink-0" />
            )}

            <p className="text-sm font-medium">
              {notification.message}
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        {/* Encabezado */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/instalaciones")}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={18} />
            Volver a instalaciones
          </button>

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {installation.codigo}
                </h1>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                    installation.status
                  )}`}
                >
                  {statusLabels[installation.status]}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClasses(
                    installation.priority
                  )}`}
                >
                  Prioridad {priorityLabels[installation.priority]}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Gestión y seguimiento de instalación de software
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="relative h-12 w-12">
                <svg
                  className="h-12 w-12 -rotate-90"
                  viewBox="0 0 36 36"
                >
                  <path
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-slate-100"
                  />

                  <path
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${progress}, 100`}
                    className="text-blue-600 transition-all duration-500"
                  />
                </svg>

                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                  {progress}%
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Progreso
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {installation.installationPrograms.filter(
                    (program) => {
                      const draft = programDrafts[program.id];
                      return draft?.installed && draft?.configured;
                    }
                  ).length}{" "}
                  de {installation.installationPrograms.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Información general */}
        <div className="mb-6 grid gap-5 lg:grid-cols-3">
          {/* Equipo */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Laptop size={20} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Equipo
                </h2>
                <p className="text-xs text-slate-500">
                  Información del computador
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">
                  Código
                </p>
                <p className="font-semibold text-slate-800">
                  {installation.equipment?.codigo || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Hostname
                </p>
                <p className="font-semibold text-slate-800">
                  {installation.equipment?.hostname || "—"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">
                    Dirección IP
                  </p>
                  <p className="font-medium text-slate-700">
                    {installation.equipment?.ip || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Sistema operativo
                  </p>
                  <p className="font-medium text-slate-700">
                    {installation.equipment?.sistemaOperativo || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">
                    Marca
                  </p>
                  <p className="font-medium text-slate-700">
                    {installation.equipment.marca || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Modelo
                  </p>
                  <p className="font-medium text-slate-700">
                    {installation.equipment.modelo || "—"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Usuario */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <User size={20} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Usuario
                </h2>
                <p className="text-xs text-slate-500">
                  Persona asignada al equipo
                </p>
              </div>
            </div>

            {installation.equipment.user ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">
                    Nombre completo
                  </p>
                  <p className="font-semibold text-slate-800">
                    {installation.equipment.user.nombres}{" "}
                    {installation.equipment.user.apellidos}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Usuario
                  </p>
                  <p className="font-medium text-slate-700">
                    {installation.equipment.user.username}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Correo
                  </p>
                  <p className="break-all font-medium text-slate-700">
                    {installation.equipment.user.email || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Área
                  </p>
                  <p className="font-medium text-slate-700">
                    {installation.equipment.area?.nombre || "—"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                El equipo no tiene un usuario asignado.
              </p>
            )}
          </section>

          {/* Asignación */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Clock3 size={20} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Seguimiento
                </h2>
                <p className="text-xs text-slate-500">
                  Información de la instalación
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">
                  Técnico asignado
                </p>

                <p className="font-semibold text-slate-800">
                  {installation.assignedSupport
                    ? `${installation.assignedSupport.nombres} ${installation.assignedSupport.apellidos}`
                    : "Sin asignar"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Creado por
                </p>

                <p className="font-medium text-slate-700">
                  {installation.createdBy
  ? `${installation.createdBy.nombres} ${installation.createdBy.apellidos}`
  : "Usuario no disponible"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Asignado
                </p>

                <p className="font-medium text-slate-700">
                  {formatDate(installation.assignedAt)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Inicio
                </p>

                <p className="font-medium text-slate-700">
                  {formatDate(installation.startedAt)}
                </p>
              </div>

              {installation.completedAt && (
                <div>
                  <p className="text-xs text-slate-400">
                    Finalizado
                  </p>

                  <p className="font-medium text-emerald-700">
                    {formatDate(installation.completedAt)}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Observaciones generales */}
        {installation.observaciones && (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <MessageSquare size={18} className="text-slate-500" />
              <h2 className="font-bold text-slate-900">
                Observaciones generales
              </h2>
            </div>

            <p className="whitespace-pre-wrap text-sm text-slate-600">
              {installation.observaciones}
            </p>
          </section>
        )}

        {/* Checklist */}
        <section className="mb-6">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Checklist de programas
              </h2>

              <p className="text-sm text-slate-500">
                Marca cada programa como instalado y configurado.
              </p>
            </div>

            <div className="text-sm font-medium text-slate-600">
              {pendingPrograms.length === 0
                ? "✓ Todos los programas están completos"
                : `${pendingPrograms.length} programa${
                    pendingPrograms.length === 1 ? "" : "s"
                  } pendiente${
                    pendingPrograms.length === 1 ? "" : "s"
                  }`}
            </div>
          </div>

          <div className="space-y-4">
            {installation.installationPrograms.map((program, index) => {
              const draft = programDrafts[program.id];

              if (!draft) return null;

              const programComplete =
                draft.installed && draft.configured;

              return (
                <article
                  key={program.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                    programComplete
                      ? "border-emerald-200"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          programComplete
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {programComplete ? (
                          <CheckCircle2 size={22} />
                        ) : (
                          <Settings2 size={22} />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-400">
                            #{index + 1}
                          </span>

                          <h3 className="font-bold text-slate-900">
                            {program.program.nombre}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getProgramStatusClasses(
                              program.status
                            )}`}
                          >
                            {programStatusLabels[program.status]}
                          </span>

                          {
                            (draft.installed !== program.installed ||
                              draft.configured !== program.configured ||
                              draft.observaciones !== (program.observaciones ?? "")) && (
                              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                                Cambios sin guardar
                              </span>
                            )
                          }
                        </div>

                        {program.program.descripcion && (
                          <p className="mt-1 text-sm text-slate-500">
                            {program.program.descripcion}
                          </p>
                        )}

                        {program.program.version && (
                          <p className="mt-1 text-xs text-slate-400">
                            Versión: {program.program.version}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isFinished}
                        onClick={() =>
                          updateDraft(
                            program.id,
                            "installed",
                            !draft.installed
                          )
                        }
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                          draft.installed
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {draft.installed ? (
                          <Check size={17} />
                        ) : (
                          <Circle size={17} />
                        )}
                        Instalado
                      </button>

                      <button
                        type="button"
                        disabled={isFinished || !draft.installed}
                        onClick={() =>
                          updateDraft(
                            program.id,
                            "configured",
                            !draft.configured
                          )
                        }
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                          draft.configured
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {draft.configured ? (
                          <Check size={17} />
                        ) : (
                          <Circle size={17} />
                        )}
                        Configurado
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-500">
                        Observaciones del programa
                      </label>

                      <textarea
                        value={draft.observaciones}
                        disabled={isFinished}
                        onChange={(event) =>
                          updateDraft(
                            program.id,
                            "observaciones",
                            event.target.value
                          )
                        }
                        rows={3}
                        placeholder="Agrega información sobre la instalación o configuración..."
                        className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={
                          isFinished ||
                          savingProgram === program.id
                        }
                        onClick={() => saveProgram(program)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                      >
                        {savingProgram === program.id ? (
                          <>
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save size={17} />
                            Guardar
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {(program.installedAt ||
                    program.configuredAt) && (
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-400">
                      {program.installedAt && (
                        <span>
                          Instalado:{" "}
                          {formatDate(program.installedAt)}
                        </span>
                      )}

                      {program.configuredAt && (
                        <span>
                          Configurado:{" "}
                          {formatDate(program.configuredAt)}
                        </span>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
  {/* ENCABEZADO */}
  <div className="mb-5 flex items-start gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
      <MessageSquare size={20} />
    </div>

    <div>
      <h2 className="font-bold text-slate-900">
        Comentarios
      </h2>

      <p className="text-sm text-slate-500">
        Comunicación entre usuario, soporte y jefe.
      </p>
    </div>
  </div>

  {/* NUEVO COMENTARIO */}
  <div className="mb-6">
    <textarea
      value={commentText}
      disabled={isFinished}
      onChange={(event) =>
        setCommentText(event.target.value)
      }
      rows={3}
      maxLength={2000}
      placeholder="Escribe un comentario, incidencia o solicitud..."
      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
    />

    <div className="mt-2 flex items-center justify-between">
      <span className="text-xs text-slate-400">
        {commentText.length}/2000
      </span>

      <button
        type="button"
        disabled={
          isFinished ||
          sendingComment ||
          !commentText.trim()
        }
        onClick={sendComment}
        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {sendingComment ? (
          <>
            <Loader2
              size={16}
              className="animate-spin"
            />
            Enviando...
          </>
        ) : (
          <>
            <MessageSquare size={16} />
            Comentar
          </>
        )}
      </button>
    </div>
  </div>

  {/* LISTA DE COMENTARIOS */}
  {/* LISTA DE COMENTARIOS */}
{comments.length === 0 ? (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
    <p className="text-sm text-slate-500">
      No hay comentarios todavía.
    </p>
  </div>
) : (
  <>
    <div className="space-y-4">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          {/* ========================================= */}
          {/* COMENTARIO PRINCIPAL                      */}
          {/* ========================================= */}

          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
              {(
                comment.user.nombres?.[0] ||
                comment.user.username?.[0] ||
                "?"
              ).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              {/* Usuario */}
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  {comment.user.nombres}{" "}
                  {comment.user.apellidos}
                </p>

                <span className="text-xs text-slate-400">
                  @{comment.user.username}
                </span>

                <span className="text-xs text-slate-400">
                  •
                </span>

                <span className="text-xs text-slate-400">
                  {new Date(
                    comment.createdAt
                  ).toLocaleString("es-PE")}
                </span>

                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  {comment.user.role}
                </span>
              </div>

              {/* Texto */}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {comment.contenido}
              </p>
            </div>
          </div>

          {/* ========================================= */}
          {/* RESPUESTAS DEL HILO                        */}
          {/* ========================================= */}

          {comment.replies &&
            comment.replies.length > 0 && (
              <div className="mt-4 ml-12 border-l-2 border-slate-200 pl-4">
                <div className="space-y-3">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow-sm">
                          {(
                            reply.user.nombres?.[0] ||
                            reply.user.username?.[0] ||
                            "?"
                          ).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Usuario */}
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-700">
                              {reply.user.nombres}{" "}
                              {reply.user.apellidos}
                            </p>

                            <span className="text-xs text-slate-400">
                              @{reply.user.username}
                            </span>

                            <span className="text-xs text-slate-400">
                              •
                            </span>

                            <span className="text-xs text-slate-400">
                              {new Date(
                                reply.createdAt
                              ).toLocaleString("es-PE")}
                            </span>

                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              {reply.user.role}
                            </span>
                          </div>

                          {/* Texto */}
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {reply.contenido}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      ))}
    </div>

    {/* ========================================= */}
    {/* RESPONDER - SIEMPRE AL FINAL              */}
    {/* ========================================= */}

    {!isFinished && (
      <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
        {replyingTo === null ? (
          <button
            type="button"
            onClick={() => {
              const lastComment =
                comments[comments.length - 1];

              setReplyingTo(lastComment.id);
              setReplyText("");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <MessageSquare className="h-4 w-4" />
            Responder
          </button>
        ) : (
         <div className="w-full">
          {renderReplyForm()}
        </div>

        )}
      </div>
    )}
  </>
)}
</section>

        {/* Finalización */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={21} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Finalizar instalación
              </h2>

              <p className="text-sm text-slate-500">
                Confirma que todos los programas fueron instalados y
                configurados correctamente.
              </p>
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            {hasUnsavedChanges ? (
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 shrink-0 text-orange-500" size={19} />

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Hay cambios sin guardar.
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Guarda los cambios de cada programa antes de finalizar la instalación.
                  </p>
                </div>
              </div>
            ) : pendingPrograms.length > 0 ? (
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 shrink-0 text-amber-500" size={19} />

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    La instalación todavía no puede finalizarse.
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Debes marcar como <strong>Instalado</strong> y{" "}
                    <strong>Configurado</strong> todos los programas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <CheckCircle2
                  className="mt-0.5 shrink-0 text-emerald-500"
                  size={19}
                />

                <div>
                  <p className="text-sm font-semibold text-emerald-700">
                    Todos los programas están completos.
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Ya puedes finalizar la instalación.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Comentario final
              <span className="ml-1 font-normal text-slate-400">
                (recomendado)
              </span>
            </label>

            <textarea
              value={finalComment}
              disabled={isFinished}
              onChange={(event) =>
                setFinalComment(event.target.value)
              }
              rows={4}
              placeholder="Describe brevemente el resultado de la instalación, configuraciones realizadas, incidencias o recomendaciones..."
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/instalaciones")}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Volver
            </button>

            {!isFinished && (
              <button
                type="button"
                disabled={!canFinalize || finalizing || savingProgram !== null}
                onClick={finalizeInstallation}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {finalizing ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Finalizar instalación
                  </>
                )}
              </button>
            )}

            {installation.status === "COMPLETADA" && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={18} />
                Instalación completada
              </div>
            )}

            {installation.status === "CANCELADA" && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
                <XCircle size={18} />
                Instalación cancelada
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}