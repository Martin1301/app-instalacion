import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        {
          message: "Usuario y contraseña son obligatorios",
        },
        {
          status: 400,
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          message: "Usuario o contraseña incorrectos",
        },
        {
          status: 401,
        }
      );
    }

    if (user.status !== "ACTIVO") {
      return NextResponse.json(
        {
          message: "El usuario se encuentra inactivo",
        },
        {
          status: 403,
        }
      );
    }

    const passwordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordCorrect) {
      return NextResponse.json(
        {
          message: "Usuario o contraseña incorrectos",
        },
        {
          status: 401,
        }
      );
    }

    const token = await signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      nombres: user.nombres ?? null,
      apellidos: user.apellidos ?? null,
    });

    const response = NextResponse.json({
      message: "Inicio de sesión correcto",
      user: {
        id: user.id,
        username: user.username,
        nombres: user.nombres,
        apellidos: user.apellidos,
        role: user.role,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false, // Permite que la cookie se guarde navegando vía http://192.168.5.103
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error en login:", error);

    return NextResponse.json(
      {
        message: "Error interno del servidor",
      },
      {
        status: 500,
      }
    );
  }
}