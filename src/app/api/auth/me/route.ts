import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        {
          message: "No autenticado",
        },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        id: true,
        username: true,
        nombres: true,
        apellidos: true,
        role: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        {
          message: "Usuario no encontrado",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      // Compatibilidad con el código existente
      id: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,

      // Datos completos del usuario
      user: currentUser,
    });
  } catch (error) {
    console.error(
      "Error obteniendo usuario actual:",
      error
    );

    return NextResponse.json(
      {
        message: "Error al obtener usuario actual",
      },
      { status: 500 }
    );
  }
}