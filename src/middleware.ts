import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET no está configurado en el archivo .env");
}

const secretKey = new TextEncoder().encode(secret);

type Role =
  | "ADMINISTRADOR"
  | "JEFE"
  | "SOPORTE"
  | "INVITADO";

const routePermissions: {
  prefix: string;
  roles: Role[];
}[] = [
  {
    prefix: "/dashboard",
    roles: [
      "ADMINISTRADOR",
      "JEFE",
      "SOPORTE",
      "INVITADO",
    ],
  },
  {
    prefix: "/usuarios",
    roles: ["ADMINISTRADOR"],
  },
  {
    prefix: "/areas",
    roles: ["ADMINISTRADOR", "JEFE"],
  },
  {
    prefix: "/equipos",
    roles: ["ADMINISTRADOR", "JEFE"],
  },
  {
    prefix: "/programas",
    roles: ["ADMINISTRADOR"],
  },
  {
    prefix: "/perfiles",
    roles: ["ADMINISTRADOR", "JEFE"],
  },
  {
  prefix: "/instalaciones",
  roles: [
    "ADMINISTRADOR",
    "JEFE",
    "SOPORTE",
  ],
},

{
  prefix: "/mi-equipo",
  roles: [
    "ADMINISTRADOR",
    "JEFE",
    "SOPORTE",
    "INVITADO",
  ],
},

{
  prefix: "/configuracion",
  roles: ["ADMINISTRADOR"],
},
];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  try {
    const { payload } = await jwtVerify(
      token,
      secretKey
    );

    const role = String(payload.role) as Role;

    const permission = routePermissions.find((route) =>
      request.nextUrl.pathname.startsWith(route.prefix)
    );

    if (permission && !permission.roles.includes(role)) {
      // Si un INVITADO intenta acceder a una sección
      // que no le corresponde, lo enviamos a su sección.
      if (role === "INVITADO") {
        return NextResponse.redirect(
          new URL("/mi-equipo", request.url)
        );
      }

      return NextResponse.redirect(
        new URL("/dashboard", request.url)
      );
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(
      new URL("/login", request.url)
    );

    response.cookies.delete("token");

    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/usuarios/:path*",
    "/areas/:path*",
    "/equipos/:path*",
    "/programas/:path*",
    "/perfiles/:path*",
    "/instalaciones/:path*",
    "/mi-equipo/:path*",
    "/configuracion/:path*",
  ],
};