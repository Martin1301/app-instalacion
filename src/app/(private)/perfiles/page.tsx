"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Package,
  Search,
  Trash2,
  UserRound,
  Monitor,
  X,
} from "lucide-react";

type User = {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
  role: string;
  status: string;
  area?: {
    id: number;
    nombre: string;
  } | null;
  equipment?: {
    id: number;
    codigo: string;
    hostname: string;
    ip: string;
    marca?: string | null;
    modelo?: string | null;
    status: string;
  } | null;
};

type Equipment = {
  id: number;
  codigo: string;
  hostname: string;
  ip: string;
  marca?: string | null;
  modelo?: string | null;
  status: string;
  user?: {
    id: number;
    nombres: string;
    apellidos: string;
  } | null;
};

type Program = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  version?: string | null;
  activo: boolean;
};

type UserProgram = {
  id: number;
  userId: number;
  programId: number;
  equipmentId?: number | null;
  observaciones?: string | null;
  program: Program;
  user: User;
  equipment?: Equipment | null;
};

export default function PerfilesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [profiles, setProfiles] = useState<UserProgram[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] =
    useState<number | null>(null);

  const [selectedPrograms, setSelectedPrograms] = useState<number[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (
    type: "success" | "error",
    message: string
  ) => {
    setNotification({ type, message });

    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const [usersRes, equipmentsRes, programsRes] = await Promise.all([
        fetch("/api/usuarios"),
        fetch("/api/equipos"),
        fetch("/api/programas"),
      ]);

      if (!usersRes.ok || !equipmentsRes.ok || !programsRes.ok) {
        throw new Error("No se pudieron cargar los datos");
      }

      const usersData = await usersRes.json();
      const equipmentsData = await equipmentsRes.json();
      const programsData = await programsRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      setEquipments(
        Array.isArray(equipmentsData) ? equipmentsData : []
      );
      setPrograms(Array.isArray(programsData) ? programsData : []);
    } catch (error) {
      console.error(error);
      showNotification(
        "error",
        "No se pudieron cargar los datos iniciales"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const userEquipments = useMemo(() => {
    if (!selectedUserId) return [];

    return equipments.filter(
      (equipment) => equipment.user?.id === selectedUserId
    );
  }, [equipments, selectedUserId]);

  const filteredUsers = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return users;

    return users.filter((user) => {
      const fullName =
        `${user.nombres} ${user.apellidos}`.toLowerCase();

      return (
        fullName.includes(value) ||
        user.username.toLowerCase().includes(value) ||
        user.area?.nombre.toLowerCase().includes(value)
      );
    });
  }, [users, search]);

  const loadProfile = async (
    userId: number,
    equipmentId: number | null
  ) => {
    try {
      const params = new URLSearchParams();
      params.set("userId", String(userId));

      if (equipmentId) {
        params.set("equipmentId", String(equipmentId));
      }

      const response = await fetch(`/api/perfiles?${params.toString()}`);

      if (!response.ok) {
        throw new Error("No se pudo cargar el perfil");
      }

      const data = await response.json();
      const profileData = Array.isArray(data) ? data : [];

      setProfiles(profileData);
      setSelectedPrograms(
        profileData.map((item: UserProgram) => item.programId)
      );
    } catch (error) {
      console.error(error);
      setProfiles([]);
      setSelectedPrograms([]);
      showNotification(
        "error",
        "No se pudo cargar el perfil de programas"
      );
    }
  };

  const handleUserChange = async (value: string) => {
    const userId = Number(value);

    if (!userId) {
      setSelectedUserId(null);
      setSelectedEquipmentId(null);
      setSelectedPrograms([]);
      setProfiles([]);
      return;
    }

    setSelectedUserId(userId);
    setSelectedEquipmentId(null);
    setSelectedPrograms([]);
    setProfiles([]);

    const userEquipment = equipments.find(
      (equipment) => equipment.user?.id === userId
    );

    if (userEquipment) {
      setSelectedEquipmentId(userEquipment.id);
      await loadProfile(userId, userEquipment.id);
    } else {
      await loadProfile(userId, null);
    }
  };

  const handleEquipmentChange = async (value: string) => {
    const equipmentId = value ? Number(value) : null;

    setSelectedEquipmentId(equipmentId);

    if (!selectedUserId) return;

    await loadProfile(selectedUserId, equipmentId);
  };

  const toggleProgram = (programId: number) => {
    setSelectedPrograms((current) =>
      current.includes(programId)
        ? current.filter((id) => id !== programId)
        : [...current, programId]
    );
  };

  const saveProfile = async () => {
    if (!selectedUserId) {
      showNotification(
        "error",
        "Selecciona primero un usuario"
      );
      return;
    }

    if (!selectedEquipmentId) {
      showNotification(
        "error",
        "Selecciona el equipo del usuario"
      );
      return;
    }

    try {
      setSaving(true);

      const existingIds = profiles
        .filter(
          (profile) =>
            profile.userId === selectedUserId &&
            profile.equipmentId === selectedEquipmentId
        )
        .map((profile) => profile.programId);

      const programsToAdd = selectedPrograms.filter(
        (programId) => !existingIds.includes(programId)
      );

      const programsToDelete = profiles.filter(
        (profile) => !selectedPrograms.includes(profile.programId)
      );

      for (const programId of programsToAdd) {
        const response = await fetch("/api/perfiles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: selectedUserId,
            programId,
            equipmentId: selectedEquipmentId,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(
            data?.message || "No se pudo agregar un programa"
          );
        }
      }

      for (const profile of programsToDelete) {
        const response = await fetch(`/api/perfiles/${profile.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(
            data?.message || "No se pudo eliminar un programa"
          );
        }
      }

      await loadProfile(selectedUserId, selectedEquipmentId);

      showNotification(
        "success",
        "Perfil de programas actualizado correctamente"
      );
    } catch (error) {
      console.error(error);

      showNotification(
        "error",
        error instanceof Error
          ? error.message
          : "No se pudo guardar el perfil"
      );
    } finally {
      setSaving(false);
    }
  };

  const clearSelection = () => {
    setSelectedUserId(null);
    setSelectedEquipmentId(null);
    setSelectedPrograms([]);
    setProfiles([]);
  };

  const activePrograms = programs.filter((program) => program.activo);

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
              <Check size={20} className="mt-0.5 shrink-0" />
            ) : (
              <X size={20} className="mt-0.5 shrink-0" />
            )}

            <p className="text-sm font-medium">
              {notification.message}
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Perfil de programas
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Define qué programas necesita cada usuario en su equipo.
              </p>
            </div>

            {selectedUserId && (
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <X size={17} />
                Limpiar selección
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* USUARIOS */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <UserRound size={20} />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Usuario
                  </h2>
                  <p className="text-xs text-slate-500">
                    Selecciona a quién configurar
                  </p>
                </div>
              </div>

              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Buscar usuario..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-500"
                />
              </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto p-3">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2
                    size={22}
                    className="animate-spin"
                  />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                  No se encontraron usuarios.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((user) => {
                    const active =
                      selectedUserId === user.id;

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() =>
                          handleUserChange(String(user.id))
                        }
                        className={`w-full rounded-xl p-3 text-left transition ${
                          active
                            ? "bg-blue-50 ring-1 ring-blue-200"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                              active
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {user.nombres.charAt(0)}
                            {user.apellidos.charAt(0)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {user.nombres} {user.apellidos}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              @{user.username}
                            </p>

                            {user.area && (
                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                {user.area.nombre}
                              </p>
                            )}
                          </div>

                          {active && (
                            <Check
                              size={18}
                              className="shrink-0 text-blue-600"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* PERFIL */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!selectedUser ? (
              <div className="flex min-h-[550px] flex-col items-center justify-center p-8 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Package size={30} />
                </div>

                <h2 className="text-lg font-semibold text-slate-800">
                  Selecciona un usuario
                </h2>

                <p className="mt-2 max-w-md text-sm text-slate-500">
                  Selecciona un usuario de la lista para configurar
                  los programas que necesitará en su equipo.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200 p-5 sm:p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <UserRound size={22} />
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          {selectedUser.nombres}{" "}
                          {selectedUser.apellidos}
                        </h2>

                        <p className="text-sm text-slate-500">
                          @{selectedUser.username}
                        </p>
                      </div>
                    </div>

                    <div className="w-full xl:w-80">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Equipo
                      </label>

                      <div className="relative">
                        <Monitor
                          size={17}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <select
                          value={
                            selectedEquipmentId
                              ? String(selectedEquipmentId)
                              : ""
                          }
                          onChange={(event) =>
                            handleEquipmentChange(
                              event.target.value
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-400"
                        >
                          <option value="">
                            Seleccionar equipo
                          </option>

                          {userEquipments.map((equipment) => (
                            <option
                              key={equipment.id}
                              value={equipment.id}
                            >
                              {equipment.codigo} —{" "}
                              {equipment.hostname}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>

                      {userEquipments.length === 0 && (
                        <p className="mt-1.5 text-xs text-amber-600">
                          Este usuario no tiene un equipo asignado.
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedEquipmentId && (
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {(() => {
                        const equipment = equipments.find(
                          (item) =>
                            item.id === selectedEquipmentId
                        );

                        if (!equipment) return null;

                        return (
                          <>
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs text-slate-400">
                                Código
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-800">
                                {equipment.codigo}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs text-slate-400">
                                Hostname
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-800">
                                {equipment.hostname}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs text-slate-400">
                                Dirección IP
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-800">
                                {equipment.ip}
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="p-5 sm:p-6">
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Programas requeridos
                      </h3>

                      <p className="text-sm text-slate-500">
                        Marca los programas que deberán instalarse.
                      </p>
                    </div>

                    <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                      {selectedPrograms.length} seleccionados
                    </div>
                  </div>

                  {activePrograms.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                      <Package
                        size={28}
                        className="mx-auto mb-3 text-slate-400"
                      />

                      <p className="text-sm font-medium text-slate-700">
                        No hay programas activos
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Registra programas desde el módulo Programas.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {activePrograms.map((program) => {
                        const selected =
                          selectedPrograms.includes(program.id);

                        return (
                          <button
                            key={program.id}
                            type="button"
                            onClick={() =>
                              toggleProgram(program.id)
                            }
                            className={`rounded-xl border p-4 text-left transition ${
                              selected
                                ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                  selected
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {selected ? (
                                  <Check size={18} />
                                ) : (
                                  <Package size={18} />
                                )}
                              </div>

                              <div
                                className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                                  selected
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {selected && (
                                  <Check size={13} />
                                )}
                              </div>
                            </div>

                            <p className="mt-3 font-semibold text-slate-800">
                              {program.nombre}
                            </p>

                            {program.version && (
                              <p className="mt-1 text-xs text-slate-400">
                                Versión {program.version}
                              </p>
                            )}

                            {program.descripcion && (
                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                {program.descripcion}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      disabled={
                        saving ||
                        !selectedEquipmentId ||
                        activePrograms.length === 0
                      }
                      onClick={saveProfile}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2
                            size={18}
                            className="animate-spin"
                          />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Check size={18} />
                          Guardar perfil
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}