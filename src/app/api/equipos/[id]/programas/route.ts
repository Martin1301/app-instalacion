import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { message: "No autenticado" },
        { status: 401 }
      );
    }

    if (
      user.role !== "ADMINISTRADOR" &&
      user.role !== "JEFE"
    ) {
      return NextResponse.json(
        { message: "No tienes permisos para consultar estos programas" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const equipmentId = Number(id);

    if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
      return NextResponse.json(
        { message: "ID de equipo inválido" },
        { status: 400 }
      );
    }

    const equipment = await prisma.equipment.findUnique({
      where: {
        id: equipmentId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { message: "Equipo no encontrado" },
        { status: 404 }
      );
    }

    if (!equipment.userId) {
      return NextResponse.json(
        {
          message:
            "El equipo no tiene un usuario asignado",
        },
        { status: 400 }
      );
    }

    /*
     * Primero buscamos el perfil específico
     * del usuario para este equipo.
     */
    let profile = await prisma.userProgram.findMany({
      where: {
        userId: equipment.userId,
        equipmentId: equipment.id,
        program: {
          activo: true,
        },
      },
      include: {
        program: true,
      },
      orderBy: {
        program: {
          nombre: "asc",
        },
      },
    });

    /*
     * Si no existe un perfil específico del equipo,
     * usamos el perfil general del usuario.
     */
    if (profile.length === 0) {
      profile = await prisma.userProgram.findMany({
        where: {
          userId: equipment.userId,
          equipmentId: null,
          program: {
            activo: true,
          },
        },
        include: {
          program: true,
        },
        orderBy: {
          program: {
            nombre: "asc",
          },
        },
      });
    }

    const programs = profile.map((item) => ({
      id: item.program.id,
      nombre: item.program.nombre,
      descripcion: item.program.descripcion,
      version: item.program.version,
      activo: item.program.activo,
    }));

    return NextResponse.json({
      programs,
    });
  } catch (error) {
    console.error(
      "Error obteniendo programas del equipo:",
      error
    );

    return NextResponse.json(
      {
        message:
          "No se pudieron obtener los programas del equipo",
      },
      { status: 500 }
    );
  }
}