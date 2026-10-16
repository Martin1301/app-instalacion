import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "No autenticado" },
        { status: 401 }
      );
    }

    if (
    currentUser.role !== "ADMINISTRADOR" &&
    currentUser.role !== "JEFE"
  ) {
    return NextResponse.json(
      { message: "No tienes permisos para consultar usuarios" },
      { status: 403 }
    );
  }

    const users = await prisma.user.findMany({
      orderBy: {
        id: "desc",
      },
      select: {
        id: true,
        username: true,
        nombres: true,
        apellidos: true,
        email: true,
        role: true,
        status: true,
        area: {
          select: {
            id: true,
            nombre: true,
          },
        },
        createdAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "No autenticado" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ADMINISTRADOR") {
      return NextResponse.json(
        { message: "No tienes permisos para crear usuarios" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const nombres = String(body.nombres ?? "").trim();
    const apellidos = String(body.apellidos ?? "").trim();
    const email = String(body.email ?? "").trim() || null;
    const role = String(body.role ?? "");
    const areaId = body.areaId ? Number(body.areaId) : null;

    if (!username || !password || !nombres || !apellidos || !role) {
      return NextResponse.json(
        {
          message:
            "Usuario, contraseña, nombres, apellidos y rol son obligatorios",
        },
        { status: 400 }
      );
    }

    const validRoles = [
      "ADMINISTRADOR",
      "JEFE",
      "SOPORTE",
      "INVITADO",
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: "Rol inválido" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          message:
            "La contraseña debe tener al menos 8 caracteres",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          {
            username,
          },
          ...(email
            ? [
                {
                  email,
                },
              ]
            : []),
        ],
      },
      select: {
        username: true,
        email: true,
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json(
          { message: "El nombre de usuario ya existe" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: "El correo electrónico ya está registrado" },
        { status: 409 }
      );
    }

    if (areaId) {
      const area = await prisma.area.findUnique({
        where: {
          id: areaId,
        },
      });

      if (!area) {
        return NextResponse.json(
          { message: "El área seleccionada no existe" },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        nombres,
        apellidos,
        email,
        role: role as
          | "ADMINISTRADOR"
          | "JEFE"
          | "SOPORTE"
          | "INVITADO",
        areaId,
      },
      select: {
        id: true,
        username: true,
        nombres: true,
        apellidos: true,
        email: true,
        role: true,
        status: true,
        area: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creando usuario:", error);

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}