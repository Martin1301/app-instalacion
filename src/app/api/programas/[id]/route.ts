import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: Params
) {
  try {
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ADMINISTRADOR") {
      return NextResponse.json(
        { error: "No tienes permisos para modificar programas" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const programId = Number(id);

    if (!Number.isInteger(programId)) {
      return NextResponse.json(
        { error: "ID de programa inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const existente = await prisma.program.findUnique({
      where: {
        id: programId,
      },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Programa no encontrado" },
        { status: 404 }
      );
    }

    const data: {
      nombre?: string;
      descripcion?: string | null;
      version?: string | null;
      activo?: boolean;
    } = {};

    if (body.nombre !== undefined) {
      const nombre = String(body.nombre).trim();

      if (!nombre) {
        return NextResponse.json(
          { error: "El nombre del programa es obligatorio" },
          { status: 400 }
        );
      }

      const duplicado = await prisma.program.findFirst({
        where: {
          nombre,
          NOT: {
            id: programId,
          },
        },
      });

      if (duplicado) {
        return NextResponse.json(
          { error: "Ya existe otro programa con ese nombre" },
          { status: 409 }
        );
      }

      data.nombre = nombre;
    }

    if (body.descripcion !== undefined) {
      const descripcion = String(body.descripcion ?? "").trim();
      data.descripcion = descripcion || null;
    }

    if (body.version !== undefined) {
      const version = String(body.version ?? "").trim();
      data.version = version || null;
    }

    if (body.activo !== undefined) {
      if (typeof body.activo !== "boolean") {
        return NextResponse.json(
          { error: "El estado activo no es válido" },
          { status: 400 }
        );
      }

      data.activo = body.activo;
    }

    const programa = await prisma.program.update({
      where: {
        id: programId,
      },
      data,
    });

    return NextResponse.json(programa);
  } catch (error) {
    console.error("Error al actualizar programa:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: Params
) {
  try {
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ADMINISTRADOR") {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar programas" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const programId = Number(id);

    if (!Number.isInteger(programId)) {
      return NextResponse.json(
        { error: "ID de programa inválido" },
        { status: 400 }
      );
    }

    const programa = await prisma.program.findUnique({
      where: {
        id: programId,
      },
      include: {
        _count: {
          select: {
            userPrograms: true,
            installationPrograms: true,
          },
        },
      },
    });

    if (!programa) {
      return NextResponse.json(
        { error: "Programa no encontrado" },
        { status: 404 }
      );
    }

    if (
      programa._count.userPrograms > 0 ||
      programa._count.installationPrograms > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Este programa ya está siendo utilizado. Puedes desactivarlo en lugar de eliminarlo.",
        },
        { status: 409 }
      );
    }

    await prisma.program.delete({
      where: {
        id: programId,
      },
    });

    return NextResponse.json({
      message: "Programa eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar programa:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}