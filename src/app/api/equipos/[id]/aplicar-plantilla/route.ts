
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ROLES_AUTORIZADOS = ["ADMINISTRADOR", "JEFE"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

function obtenerId(valor: string): number | null {
  const id = Number(valor);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

// POST: aplicar la plantilla del área al perfil del equipo.
export async function POST(
  _request: NextRequest,
  { params }: RouteContext
) {
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
        { error: "No tienes permisos para aplicar plantillas." },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const equipoId = obtenerId(idParam);

    if (equipoId === null) {
      return NextResponse.json(
        { error: "El identificador del equipo no es válido." },
        { status: 400 }
      );
    }

    const equipo = await prisma.equipment.findUnique({
      where: { id: equipoId },
      select: {
        id: true,
        codigo: true,
        status: true,
        userId: true,
        areaId: true,
        user: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },
        area: {
          select: {
            id: true,
            nombre: true,
            estado: true,
          },
        },
      },
    });

    if (!equipo) {
      return NextResponse.json(
        { error: "No se encontró el equipo solicitado." },
        { status: 404 }
      );
    }

    if (equipo.status === "BAJA") {
      return NextResponse.json(
        { error: "No se puede aplicar una plantilla a un equipo dado de baja." },
        { status: 400 }
      );
    }

    if (!equipo.userId || !equipo.user) {
      return NextResponse.json(
        {
          error:
            "El equipo no tiene un usuario asignado. Asigna un usuario antes de aplicar la plantilla.",
        },
        { status: 400 }
      );
    }

    if (!equipo.areaId || !equipo.area) {
      return NextResponse.json(
        {
          error:
            "El equipo no tiene un área asignada. Asigna un área antes de aplicar la plantilla.",
        },
        { status: 400 }
      );
    }

    if (!equipo.area.estado) {
      return NextResponse.json(
        { error: "El área del equipo está inactiva." },
        { status: 400 }
      );
    }

    const plantilla = await prisma.areaProgramTemplate.findUnique({
      where: { areaId: equipo.areaId },
      select: {
        id: true,
        activo: true,
        programs: {
          where: {
            program: {
              activo: true,
            },
          },
          select: {
            programId: true,
          },
        },
      },
    });

    if (!plantilla || !plantilla.activo) {
      return NextResponse.json(
        {
          error: `El área "${equipo.area.nombre}" no tiene una plantilla activa.`,
        },
        { status: 404 }
      );
    }

    const programIds = [
      ...new Set(plantilla.programs.map((item) => item.programId)),
    ];

    if (programIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "La plantilla del área no contiene programas activos para aplicar.",
        },
        { status: 400 }
      );
    }

    const programasExistentes = await prisma.userProgram.findMany({
      where: {
        userId: equipo.userId,
        equipmentId: equipo.id,
        programId: {
          in: programIds,
        },
      },
      select: {
        programId: true,
      },
    });

    const existentes = new Set(
      programasExistentes.map((item) => item.programId)
    );

    const programasNuevos = programIds.filter(
      (programId) => !existentes.has(programId)
    );

    let agregados = 0;

    if (programasNuevos.length > 0) {
      const resultado = await prisma.userProgram.createMany({
        data: programasNuevos.map((programId) => ({
          userId: equipo.userId!,
          equipmentId: equipo.id,
          programId,
        })),
        skipDuplicates: true,
      });

      agregados = resultado.count;
    }

    const yaExistian = programIds.length - agregados;

    return NextResponse.json({
      mensaje:
        agregados > 0
          ? "Plantilla aplicada correctamente."
          : "El equipo ya tenía todos los programas de la plantilla.",
      equipo: {
        id: equipo.id,
        codigo: equipo.codigo,
      },
      usuario: {
        id: equipo.user.id,
        nombre: `${equipo.user.nombres} ${equipo.user.apellidos}`,
      },
      area: equipo.area.nombre,
      totalProgramasPlantilla: programIds.length,
      agregados,
      yaExistian,
    });
  } catch (error) {
    console.error("Error al aplicar plantilla al equipo:", error);

    return NextResponse.json(
      { error: "No se pudo aplicar la plantilla al equipo." },
      { status: 500 }
    );
  }
}
