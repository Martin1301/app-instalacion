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
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMINISTRADOR") {
      return NextResponse.json(
        { error: "No tienes permisos para modificar áreas" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const areaId = Number(id);

    if (!Number.isInteger(areaId)) {
      return NextResponse.json(
        { error: "ID de área inválido" },
        { status: 400 }
      );
    }

    const existente = await prisma.area.findUnique({
      where: {
        id: areaId,
      },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Área no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const data: {
      nombre?: string;
      descripcion?: string | null;
      estado?: boolean;
    } = {};

    if (body.nombre !== undefined) {
      const nombre = String(body.nombre).trim();

      if (!nombre) {
        return NextResponse.json(
          { error: "El nombre del área es obligatorio" },
          { status: 400 }
        );
      }

      const duplicada = await prisma.area.findFirst({
        where: {
          nombre,
          NOT: {
            id: areaId,
          },
        },
      });

      if (duplicada) {
        return NextResponse.json(
          { error: "Ya existe otra área con ese nombre" },
          { status: 409 }
        );
      }

      data.nombre = nombre;
    }

    if (body.descripcion !== undefined) {
      const descripcion = String(body.descripcion || "").trim();

      data.descripcion = descripcion || null;
    }

    if (body.estado !== undefined) {
      data.estado = Boolean(body.estado);
    }

    const area = await prisma.area.update({
      where: {
        id: areaId,
      },
      data,
    });

    return NextResponse.json(area);
  } catch (error) {
    console.error("Error al actualizar área:", error);

    return NextResponse.json(
      { error: "Error al actualizar el área" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: Params
) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMINISTRADOR") {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar áreas" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const areaId = Number(id);

    if (!Number.isInteger(areaId)) {
      return NextResponse.json(
        { error: "ID de área inválido" },
        { status: 400 }
      );
    }

    const area = await prisma.area.findUnique({
      where: {
        id: areaId,
      },
      include: {
        _count: {
          select: {
            users: true,
            equipment: true,
          },
        },
      },
    });

    if (!area) {
      return NextResponse.json(
        { error: "Área no encontrada" },
        { status: 404 }
      );
    }

    if (area._count.users > 0 || area._count.equipment > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar esta área porque tiene usuarios o equipos asociados. Puedes desactivarla.",
        },
        { status: 409 }
      );
    }

    await prisma.area.delete({
      where: {
        id: areaId,
      },
    });

    return NextResponse.json({
      message: "Área eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar área:", error);

    return NextResponse.json(
      { error: "Error al eliminar el área" },
      { status: 500 }
    );
  }
}