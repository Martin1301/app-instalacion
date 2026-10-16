"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Laptop,
  Package,
  Wrench,
  ArrowLeft,
  LogOut,
  MonitorCog,
  ClipboardList,
  UserCircle,
  ClipboardCheck,
} from "lucide-react";

type Role =
  | "ADMINISTRADOR"
  | "JEFE"
  | "SOPORTE"
  | "INVITADO";

type MenuItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
};

const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMINISTRADOR", "JEFE", "SOPORTE", "INVITADO"],
  },
  {
    name: "Mi equipo",
    href: "/mi-equipo",
    icon: Laptop,
    roles: [
      "ADMINISTRADOR",
      "JEFE",
      "SOPORTE",
      "INVITADO",
    ],
  },
  {
    name: "Áreas",
    href: "/areas",
    icon: Building2,
    roles: ["ADMINISTRADOR", "JEFE"],
  },
  {
    name: "Usuarios",
    href: "/usuarios",
    icon: Users,
    roles: ["ADMINISTRADOR"],
  },
  {
    name: "Equipos",
    href: "/equipos",
    icon: Laptop,
    roles: ["ADMINISTRADOR", "JEFE"],
  },
  {
    name: "Programas",
    href: "/programas",
    icon: Package,
    roles: ["ADMINISTRADOR"],
  },
  {
  name: "Plantillas por área",
  href: "/plantillas-area",
  icon: ClipboardCheck,
  roles: ["ADMINISTRADOR", "JEFE"],
  },
  {
    name: "Perfil de programas",
    href: "/perfiles",
    icon: ClipboardList,
    roles: ["ADMINISTRADOR"],
  },
  {
    name: "Instalaciones",
    href: "/instalaciones",
    icon: Wrench,
    roles: ["ADMINISTRADOR", "JEFE", "SOPORTE"],
  },
];

type SidebarProps = {
  role: Role;
};

export default function Sidebar({ role }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [userName, setUserName] = useState("");
  const [userLastName, setUserLastName] = useState("");

  useEffect(() => {
  const loadCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();

      setUserName(data.user?.nombres ?? "");
      setUserLastName(data.user?.apellidos ?? "");
    } catch (error) {
      console.error(
        "Error al obtener usuario actual:",
        error
      );
    }
  };

  loadCurrentUser();
}, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const handleBack = () => {
    router.back();
  };

  const visibleMenuItems = menuItems.filter((item) =>
    item.roles.includes(role)
  );

  const fullName =
  `${userName} ${userLastName}`.trim();

  const roleName: Record<Role, string> = {
    ADMINISTRADOR: "Administrador",
    JEFE: "Jefe",
    SOPORTE: "Soporte",
    INVITADO: "Invitado",
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-slate-900 p-4 text-white">

      {/* Logo */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
          <MonitorCog size={23} />
        </div>

        <div>
          <h1 className="text-lg font-bold">
            Instalaciones TI
          </h1>

          <p className="text-xs text-slate-400">
            Gestión de software
          </p>
        </div>
      </div>

{/* Usuario actual */}
      <div className="mb-3 rounded-xl border border-slate-700 bg-slate-800/60 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600">
            <UserCircle size={22} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {fullName || "Usuario"}
            </p>

            <p className="text-xs text-slate-400">
              {roleName[role]}
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-1">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;

          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      

      {/* Acciones */}
      <div className="space-y-1 border-t border-slate-700 pt-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft size={19} />
          <span>Volver</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={19} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

