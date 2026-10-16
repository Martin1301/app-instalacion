
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ROLES_AUTORIZADOS = ["ADMINISTRADOR", "JEFE"];

// GET: consultar las plantillas de todas las áreas.
export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No has iniciado sesión." },
        { status: 401 }
      );
    }

    if (!ROLES_AUTORIZADOS.includes(user.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para consultar las plantillas." },
        { status: 403 }
      );
    }

    const plantillas = await prisma.areaProgramTemplate.findMany({
      include: {
        area: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            estado: true,
          },
        },
        programs: {
          include: {
            program: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
                version: true,
                activo: true,
              },
            },
          },
          orderBy: {
            program: {
              nombre: "asc",
            },
          },
        },
      },
      orderBy: {
        area: {
          nombre: "asc",
        },
      },
    });

    return NextResponse.json(plantillas);
  } catch (error) {
    console.error("Error al consultar plantillas:", error);

    return NextResponse.json(
      { error: "No se pudieron consultar las plantillas." },
      { status: 500 }
    );
  }
}

// POST: crear una plantilla para un área.
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No has iniciado sesión." },
        { status: 401 }
      );
    }

    if (!ROLES_AUTORIZADOS.includes(user.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para crear plantillas." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const areaId = Number(body.areaId);
    const descripcion =
      typeof body.descripcion === "string"
        ? body.descripcion.trim()
        : null;

    if (
      !Number.isSafeInteger(areaId) ||
      areaId <= 0
    ) {
      return NextResponse.json(
        { error: "Debes seleccionar un área válida." },
        { status: 400 }
      );
    }

    if (
      descripcion !== null &&
      descripcion.length > 500
    ) {
      return NextResponse.json(
        { error: "La descripción no puede superar los 500 caracteres." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(body.programIds) ||
      body.programIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Selecciona al menos un programa." },
        { status: 400 }
      );
    }

    const programIds: number[] = body.programIds;

    if (
      !programIds.every(
        (id) =>
          typeof id === "number" &&
          Number.isSafeInteger(id) &&
          id > 0
      )
    ) {
      return NextResponse.json(
        { error: "La lista contiene identificadores de programas inválidos." },
        { status: 400 }
      );
    }

    const idsUnicos = [...new Set(programIds)];

    if (idsUnicos.length !== programIds.length) {
      return NextResponse.json(
        { error: "No puedes seleccionar un programa más de una vez." },
        { status: 400 }
      );
    }

    const area = await prisma.area.findUnique({
      where: { id: areaId },
      select: {
        id: true,
        nombre: true,
        estado: true,
      },
    });

    if (!area) {
      return NextResponse.json(
        { error: "El área seleccionada no existe." },
        { status: 404 }
      );
    }

    if (!area.estado) {
      return NextResponse.json(
        { error: "No puedes crear una plantilla para un área inactiva." },
        { status: 400 }
      );
    }

    const programas = await prisma.program.findMany({
      where: {
        id: { in: idsUnicos },
        activo: true,
      },
      select: { id: true },
    });

    if (programas.length !== idsUnicos.length) {
      return NextResponse.json(
        {
          error:
            "Uno o más programas no existen o están inactivos.",
        },
        { status: 400 }
      );
    }

    const plantillaExistente =
      await prisma.areaProgramTemplate.findUnique({
        where: { areaId },
        select: { id: true },
      });

    if (plantillaExistente) {
      return NextResponse.json(
        {
          error:
            "Esta área ya tiene una plantilla. Debes editar la existente.",
        },
        { status: 409 }
      );
    }

    const plantilla = await prisma.areaProgramTemplate.create({
      data: {
        areaId,
        descripcion,
        programs: {
          create: idsUnicos.map((programId) => ({
            program: {
              connect: { id: programId },
            },
          })),
        },
      },
      include: {
        area: {
          select: {
            id: true,
            nombre: true,
          },
        },
        programs: {
          include: {
            program: {
              select: {
                id: true,
                nombre: true,
                version: true,
                activo: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        mensaje: "Plantilla creada correctamente.",
        plantilla,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear plantilla:", error);

    // P2002: una restricción única fue infringida.
    // También protege ante dos solicitudes simultáneas.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Esta área ya tiene una plantilla." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo crear la plantilla." },
      { status: 500 }
    );
  }
}