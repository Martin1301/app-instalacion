"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  X,
  Save,
  KeyRound,
  Users,
} from "lucide-react";

type Role = "ADMINISTRADOR" | "JEFE" | "SOPORTE" | "INVITADO";

type Area = {
  id: number;
  nombre: string;
};

type User = {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  role: Role;
  status: "ACTIVO" | "INACTIVO";
  areaId: number | null;
  area: Area | null;
};

const roles: { value: Role; label: string }[] = [
  { value: "ADMINISTRADOR", label: "Administrador" },
  { value: "JEFE", label: "Jefe" },
  { value: "SOPORTE", label: "Soporte" },
  { value: "INVITADO", label: "Invitado" },
];

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

    const messageType = message
    ? "success"
    : error
    ? "error"
    : null;

const messageText = message || error;

  // Formulario nuevo usuario
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    nombres: "",
    apellidos: "",
    email: "",
    role: "SOPORTE" as Role,
    areaId: "",
  });

  // Formulario edición
  const [editUser, setEditUser] = useState({
    username: "",
    nombres: "",
    apellidos: "",
    email: "",
    role: "SOPORTE" as Role,
    areaId: "",
    password: "",
  });

  useEffect(() => {
    loadUsers();
    loadAreas();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);

      const response = await fetch("/api/usuarios");

      if (!response.ok) {
        throw new Error("No se pudieron cargar los usuarios");
      }

      const data = await response.json();

      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar los usuarios"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAreas() {
    try {
      const response = await fetch("/api/areas");

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setAreas(data);
      }
    } catch {
      // Las áreas son opcionales para esta pantalla.
    }
  }

  function resetMessages() {
    setMessage("");
    setError("");
  }

  function openNewModal() {
    resetMessages();

    setNewUser({
      username: "",
      password: "",
      nombres: "",
      apellidos: "",
      email: "",
      role: "SOPORTE",
      areaId: "",
    });

    setShowModal(true);
  }

  function openEditModal(user: User) {
    resetMessages();

    setSelectedUser(user);

    setEditUser({
      username: user.username,
      nombres: user.nombres,
      apellidos: user.apellidos,
      email: user.email || "",
      role: user.role,
      areaId: user.areaId ? String(user.areaId) : "",
      password: "",
    });

    setShowEditModal(true);
  }

  function closeModals() {
    if (saving) return;

    setShowModal(false);
    setShowEditModal(false);
    setSelectedUser(null);
    resetMessages();
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();

    resetMessages();
    setSaving(true);

    try {
      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          nombres: newUser.nombres,
          apellidos: newUser.apellidos,
          email: newUser.email || null,
          role: newUser.role,
          areaId: newUser.areaId
            ? Number(newUser.areaId)
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear el usuario");
      }

      setMessage("Usuario creado correctamente.");

      setShowModal(false);

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al crear el usuario"
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedUser) return;

    resetMessages();
    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        username: editUser.username,
        nombres: editUser.nombres,
        apellidos: editUser.apellidos,
        email: editUser.email || null,
        role: editUser.role,
        areaId: editUser.areaId
          ? Number(editUser.areaId)
          : null,
      };

      // Solo enviamos password si el administrador escribió una nueva.
      if (editUser.password.trim()) {
        body.password = editUser.password;
      }

      const response = await fetch(
        `/api/usuarios/${selectedUser.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo actualizar el usuario"
        );
      }

      setMessage("Usuario actualizado correctamente.");

      setShowEditModal(false);
      setSelectedUser(null);

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al actualizar el usuario"
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: User) {
    resetMessages();

    const nuevoEstado =
      user.status === "ACTIVO" ? "INACTIVO" : "ACTIVO";

    const confirmar = window.confirm(
      `¿Deseas ${nuevoEstado === "ACTIVO" ? "activar" : "desactivar"} al usuario "${user.username}"?`
    );

    if (!confirmar) return;

    try {
      const response = await fetch(
        `/api/usuarios/${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nuevoEstado,
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
        nuevoEstado === "ACTIVO"
          ? "Usuario activado correctamente."
          : "Usuario desactivado correctamente."
      );

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cambiar el estado"
      );
    }
  }

  async function deleteUser(user: User) {
    resetMessages();

    if (user.role === "ADMINISTRADOR") {
      setError(
        "Los usuarios administradores no deben eliminarse desde esta pantalla."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Estás seguro de eliminar al usuario "${user.username}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      const response = await fetch(
        `/api/usuarios/${user.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo eliminar el usuario"
        );
      }

      setMessage("Usuario eliminado correctamente.");

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al eliminar el usuario"
      );
    }
  }

  const filteredUsers = users.filter((user) => {
    const text = search.toLowerCase();

    return (
      user.username.toLowerCase().includes(text) ||
      user.nombres.toLowerCase().includes(text) ||
      user.apellidos.toLowerCase().includes(text) ||
      user.role.toLowerCase().includes(text) ||
      (user.email || "").toLowerCase().includes(text) ||
      (user.area?.nombre || "").toLowerCase().includes(text)
    );
  });

  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) => user.status === "ACTIVO"
  ).length;

  const inactiveUsers = users.filter(
    (user) => user.status === "INACTIVO"
  ).length;

  const supportUsers = users.filter(
    (user) => user.role === "SOPORTE"
  ).length;

  function roleLabel(role: Role) {
    return roles.find((item) => item.value === role)?.label || role;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">

        {messageType && messageText && (
        <MessageModal
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
            Usuarios
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Administra los usuarios y sus permisos de acceso.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <UserPlus size={18} />
          Nuevo usuario
        </button>
      </div>


      {/* RESUMEN */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total usuarios"
          value={totalUsers}
          icon={<Users size={20} />}
        />

        <SummaryCard
          title="Usuarios activos"
          value={activeUsers}
          icon={<UserCheck size={20} />}
        />

        <SummaryCard
          title="Usuarios inactivos"
          value={inactiveUsers}
          icon={<UserX size={20} />}
        />

        <SummaryCard
          title="Soporte"
          value={supportUsers}
          icon={<Users size={20} />}
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
              placeholder="Buscar usuario..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white text-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">Usuario</th>
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4">Rol</th>
                <th className="px-5 py-4">Área</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    {/* USUARIO */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                          {user.nombres.charAt(0)}
                          {user.apellidos.charAt(0)}
                        </div>

                        <div>
                          <p className="font-medium text-slate-800">
                            {user.username}
                          </p>

                          <p className="text-xs text-slate-400">
                            {user.email || "Sin correo"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* NOMBRE */}
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {user.nombres} {user.apellidos}
                    </td>

                    {/* ROL */}
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {roleLabel(user.role)}
                      </span>
                    </td>

                    {/* AREA */}
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {user.area?.nombre || "Sin área"}
                    </td>

                    {/* ESTADO */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${
                          user.status === "ACTIVO"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.status === "ACTIVO"
                          ? "Activo"
                          : "Inactivo"}
                      </span>
                    </td>

                    {/* ACCIONES */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {/* EDITAR */}
                        <button
                          onClick={() => openEditModal(user)}
                          title="Editar usuario"
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={16} />
                        </button>

                        {/* ACTIVAR / DESACTIVAR */}
                        <button
                          onClick={() => toggleStatus(user)}
                          disabled={user.role === "ADMINISTRADOR"}
                          title={
                            user.role === "ADMINISTRADOR"
                              ? "No disponible para administrador"
                              : user.status === "ACTIVO"
                              ? "Desactivar usuario"
                              : "Activar usuario"
                          }
                          className={`rounded-lg border p-2 transition ${
                            user.role === "ADMINISTRADOR"
                              ? "cursor-not-allowed border-slate-100 text-slate-300"
                              : user.status === "ACTIVO"
                              ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {user.status === "ACTIVO" ? (
                            <UserX size={16} />
                          ) : (
                            <UserCheck size={16} />
                          )}
                        </button>

                        {/* ELIMINAR */}
                        <button
                          onClick={() => deleteUser(user)}
                          disabled={user.role === "ADMINISTRADOR"}
                          title={
                            user.role === "ADMINISTRADOR"
                              ? "No disponible para administrador"
                              : "Eliminar usuario"
                          }
                          className={`rounded-lg border p-2 transition ${
                            user.role === "ADMINISTRADOR"
                              ? "cursor-not-allowed border-slate-100 text-slate-300"
                              : "border-red-200 text-red-600 hover:bg-red-50"
                          }`}
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

      {/* MODAL NUEVO USUARIO */}
      {showModal && (
        <Modal
          title="Nuevo usuario"
          subtitle="Registra un nuevo usuario en la plataforma."
          onClose={closeModals}
        >
          <form onSubmit={createUser} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Usuario"
                value={newUser.username}
                onChange={(value) =>
                  setNewUser({
                    ...newUser,
                    username: value,
                  })
                }
                required
              />

              <Input
                label="Contraseña"
                type="password"
                value={newUser.password}
                onChange={(value) =>
                  setNewUser({
                    ...newUser,
                    password: value,
                  })
                }
                required
              />

              <Input
                label="Nombres"
                value={newUser.nombres}
                onChange={(value) =>
                  setNewUser({
                    ...newUser,
                    nombres: value,
                  })
                }
                required
              />

              <Input
                label="Apellidos"
                value={newUser.apellidos}
                onChange={(value) =>
                  setNewUser({
                    ...newUser,
                    apellidos: value,
                  })
                }
                required
              />

              <Input
                label="Correo electrónico"
                type="email"
                value={newUser.email}
                onChange={(value) =>
                  setNewUser({
                    ...newUser,
                    email: value,
                  })
                }
              />

              <Select
                label="Rol"
                value={newUser.role}
                onChange={(value) =>
                  setNewUser({
                    ...newUser,
                    role: value as Role,
                  })
                }
                options={roles.map((role) => ({
                  value: role.value,
                  label: role.label,
                }))}
              />

              <Select
                label="Área"
                value={newUser.areaId}
                onChange={(value) =>
                  setNewUser({
                    ...newUser,
                    areaId: value,
                  })
                }
                options={[
                  {
                    value: "",
                    label: areas.length
                      ? "Sin área"
                      : "Sin áreas disponibles",
                  },
                  ...areas.map((area) => ({
                    value: String(area.id),
                    label: area.nombre,
                  })),
                ]}
              />
            </div>

            <ModalButtons
              onCancel={closeModals}
              saving={saving}
              text="Crear usuario"
            />
          </form>
        </Modal>
      )}

      {/* MODAL EDITAR */}
      {showEditModal && selectedUser && (
        <Modal
          title="Editar usuario"
          subtitle={`Modifica la información de ${selectedUser.username}.`}
          onClose={closeModals}
        >
          <form onSubmit={updateUser} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Usuario"
                value={editUser.username}
                onChange={(value) =>
                  setEditUser({
                    ...editUser,
                    username: value,
                  })
                }
                required
              />

              <Input
                label="Nueva contraseña"
                type="password"
                value={editUser.password}
                onChange={(value) =>
                  setEditUser({
                    ...editUser,
                    password: value,
                  })
                }
                placeholder="Dejar vacío para conservarla"
              />

              <Input
                label="Nombres"
                value={editUser.nombres}
                onChange={(value) =>
                  setEditUser({
                    ...editUser,
                    nombres: value,
                  })
                }
                required
              />

              <Input
                label="Apellidos"
                value={editUser.apellidos}
                onChange={(value) =>
                  setEditUser({
                    ...editUser,
                    apellidos: value,
                  })
                }
                required
              />

              <Input
                label="Correo electrónico"
                type="email"
                value={editUser.email}
                onChange={(value) =>
                  setEditUser({
                    ...editUser,
                    email: value,
                  })
                }
              />

              <Select
                label="Rol"
                value={editUser.role}
                onChange={(value) =>
                  setEditUser({
                    ...editUser,
                    role: value as Role,
                  })
                }
                options={roles.map((role) => ({
                  value: role.value,
                  label: role.label,
                }))}
              />

              <Select
                label="Área"
                value={editUser.areaId}
                onChange={(value) =>
                  setEditUser({
                    ...editUser,
                    areaId: value,
                  })
                }
                options={[
                  {
                    value: "",
                    label: areas.length
                      ? "Sin área"
                      : "Sin áreas disponibles",
                  },
                  ...areas.map((area) => ({
                    value: String(area.id),
                    label: area.nombre,
                  })),
                ]}
              />
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div className="flex gap-3">
                <KeyRound
                  size={18}
                  className="mt-0.5 text-blue-600"
                />

                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Cambio de contraseña
                  </p>

                  <p className="mt-1 text-xs text-blue-600">
                    Si escribes una contraseña nueva, reemplazará la
                    contraseña actual. Si la dejas vacía, se conservará.
                  </p>
                </div>
              </div>
            </div>

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
        <span className="text-sm text-slate-500">{title}</span>

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
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
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

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
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

        {saving ? "Guardando..." : text}
      </button>
    </div>
  );
}   

function MessageModal({
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
          title="Cerrar"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}