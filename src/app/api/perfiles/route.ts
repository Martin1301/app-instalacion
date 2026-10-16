import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const userIdParam = searchParams.get("userId");
    const equipmentIdParam = searchParams.get("equipmentId");

    const userId = userIdParam ? Number(userIdParam) : undefined;
    const equipmentId = equipmentIdParam
      ? Number(equipmentIdParam)
      : undefined;

    if (
      userIdParam &&
      (!Number.isInteger(userId) || userId! <= 0)
    ) {
      return NextResponse.json(
        { error: "Usuario inválido" },
        { status: 400 }
      );
    }

    if (
      equipmentIdParam &&
      (!Number.isInteger(equipmentId) || equipmentId! <= 0)
    ) {
      return NextResponse.json(
        { error: "Equipo inválido" },
        { status: 400 }
      );
    }

    const userPrograms = await prisma.userProgram.findMany({
      where: {
        ...(userId !== undefined ? { userId } : {}),
        ...(equipmentId !== undefined ? { equipmentId } : {}),
      },
      include: {
        program: true,
        user: {
          select: {
            id: true,
            username: true,
            nombres: true,
            apellidos: true,
          },
        },
        equipment: {
          select: {
            id: true,
            codigo: true,
            hostname: true,
            ip: true,
          },
        },
      },
      orderBy: {
        program: {
          nombre: "asc",
        },
      },
    });

    return NextResponse.json(userPrograms);
  } catch (error) {
    console.error("Error al obtener perfil de programas:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    if (
      currentUser.role !== "ADMINISTRADOR" &&
      currentUser.role !== "JEFE"
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para modificar perfiles de programas",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const userId = Number(body.userId);
    const programId = Number(body.programId);
    const equipmentId =
      body.equipmentId !== undefined &&
      body.equipmentId !== null &&
      body.equipmentId !== ""
        ? Number(body.equipmentId)
        : null;

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { error: "Usuario inválido" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(programId) || programId <= 0) {
      return NextResponse.json(
        { error: "Programa inválido" },
        { status: 400 }
      );
    }

    if (
      equipmentId !== null &&
      (!Number.isInteger(equipmentId) || equipmentId <= 0)
    ) {
      return NextResponse.json(
        { error: "Equipo inválido" },
        { status: 400 }
      );
    }

    const [user, program, equipment] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          status: true,
        },
      }),

      prisma.program.findUnique({
        where: { id: programId },
        select: {
          id: true,
          nombre: true,
          activo: true,
        },
      }),

      equipmentId !== null
        ? prisma.equipment.findUnique({
            where: { id: equipmentId },
            select: {
              id: true,
              userId: true,
              status: true,
            },
          })
        : null,
    ]);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (user.status !== "ACTIVO") {
      return NextResponse.json(
        { error: "El usuario se encuentra inactivo" },
        { status: 400 }
      );
    }

    if (!program) {
      return NextResponse.json(
        { error: "Programa no encontrado" },
        { status: 404 }
      );
    }

    if (!program.activo) {
      return NextResponse.json(
        {
          error:
            "No se puede agregar un programa inactivo a un perfil",
        },
        { status: 400 }
      );
    }

    if (equipmentId !== null) {
      if (!equipment) {
        return NextResponse.json(
          { error: "Equipo no encontrado" },
          { status: 404 }
        );
      }

      if (equipment.userId !== userId) {
        return NextResponse.json(
          {
            error:
              "El equipo seleccionado no pertenece al usuario indicado",
          },
          { status: 400 }
        );
      }

      if (equipment.status === "BAJA") {
        return NextResponse.json(
          {
            error:
              "No se puede asignar un programa a un equipo dado de baja",
          },
          { status: 400 }
        );
      }
    }

    const existente = await prisma.userProgram.findFirst({
      where: {
        userId,
        programId,
        equipmentId,
      },
    });

    if (existente) {
      return NextResponse.json(
        {
          error:
            "Este programa ya forma parte del perfil seleccionado",
        },
        { status: 409 }
      );
    }

    const userProgram = await prisma.userProgram.create({
      data: {
        userId,
        programId,
        equipmentId,
      },
      include: {
        program: true,
        equipment: {
          select: {
            id: true,
            codigo: true,
            hostname: true,
          },
        },
      },
    });

    return NextResponse.json(userProgram, { status: 201 });
  } catch (error) {
    console.error("Error al agregar programa al perfil:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}