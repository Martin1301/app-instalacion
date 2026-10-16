
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

// GET: consultar una plantilla por ID.
export async function GET(
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
        { error: "No tienes permisos para consultar plantillas." },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const id = obtenerId(idParam);

    if (id === null) {
      return NextResponse.json(
        { error: "El identificador de la plantilla no es válido." },
        { status: 400 }
      );
    }

    const plantilla = await prisma.areaProgramTemplate.findUnique({
      where: { id },
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
    });

    if (!plantilla) {
      return NextResponse.json(
        { error: "No se encontró la plantilla solicitada." },
        { status: 404 }
      );
    }

    return NextResponse.json(plantilla);
  } catch (error) {
    console.error("Error al consultar plantilla:", error);

    return NextResponse.json(
      { error: "No se pudo consultar la plantilla." },
      { status: 500 }
    );
  }
}


// PUT: actualizar la descripción y los programas de una plantilla.
export async function PUT(
  request: NextRequest,
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
        { error: "No tienes permisos para editar plantillas." },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const id = obtenerId(idParam);

    if (id === null) {
      return NextResponse.json(
        { error: "El identificador de la plantilla no es válido." },
        { status: 400 }
      );
    }

    const plantillaExistente =
      await prisma.areaProgramTemplate.findUnique({
        where: { id },
        select: {
          id: true,
          descripcion: true,
          areaId: true,
        },
      });

    if (!plantillaExistente) {
      return NextResponse.json(
        { error: "No se encontró la plantilla que deseas editar." },
        { status: 404 }
      );
    }

    const body = await request.json();

    let descripcion = plantillaExistente.descripcion;

    if (body.descripcion !== undefined) {
      if (
        body.descripcion !== null &&
        typeof body.descripcion !== "string"
      ) {
        return NextResponse.json(
          { error: "La descripción debe ser un texto válido." },
          { status: 400 }
        );
      }

      descripcion =
        typeof body.descripcion === "string"
          ? body.descripcion.trim()
          : null;

      if (descripcion !== null && descripcion.length > 500) {
        return NextResponse.json(
          {
            error: "La descripción no puede superar los 500 caracteres.",
          },
          { status: 400 }
        );
      }
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

    const programIds: unknown[] = body.programIds;

    if (
      !programIds.every(
        (programId) =>
          typeof programId === "number" &&
          Number.isSafeInteger(programId) &&
          programId > 0
      )
    ) {
      return NextResponse.json(
        { error: "La lista contiene identificadores inválidos." },
        { status: 400 }
      );
    }

    const idsUnicos = [...new Set(programIds as number[])];

    if (idsUnicos.length !== programIds.length) {
      return NextResponse.json(
        { error: "No puedes seleccionar un programa más de una vez." },
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
          error: "Uno o más programas no existen o están inactivos.",
        },
        { status: 400 }
      );
    }

    const plantilla = await prisma.areaProgramTemplate.update({
      where: { id },
      data: {
        descripcion,
        programs: {
          deleteMany: {},
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
          orderBy: {
            program: {
              nombre: "asc",
            },
          },
        },
      },
    });

    return NextResponse.json({
      mensaje: "Plantilla actualizada correctamente.",
      plantilla,
    });
  } catch (error) {
    console.error("Error al actualizar plantilla:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar la plantilla." },
      { status: 500 }
    );
  }
}


export async function DELETE(
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
        { error: "No tienes permisos para eliminar plantillas." },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const id = obtenerId(idParam);

    if (id === null) {
      return NextResponse.json(
        { error: "El identificador de la plantilla no es válido." },
        { status: 400 }
      );
    }

    const plantilla = await prisma.areaProgramTemplate.findUnique({
      where: { id },
      select: { id: true, areaId: true },
    });

    if (!plantilla) {
      return NextResponse.json(
        { error: "La plantilla no existe o ya fue eliminada." },
        { status: 404 }
      );
    }

    await prisma.areaProgramTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      mensaje: "Plantilla eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error al eliminar plantilla:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar la plantilla." },
      { status: 500 }
    );
  }
}
