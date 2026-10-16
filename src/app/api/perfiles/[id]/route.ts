import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

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

    const { id } = await params;
    const userProgramId = Number(id);

    if (!Number.isInteger(userProgramId) || userProgramId <= 0) {
      return NextResponse.json(
        { error: "ID de perfil inválido" },
        { status: 400 }
      );
    }

    const userProgram = await prisma.userProgram.findUnique({
      where: {
        id: userProgramId,
      },
      include: {
        program: true,
      },
    });

    if (!userProgram) {
      return NextResponse.json(
        { error: "Asignación de programa no encontrada" },
        { status: 404 }
      );
    }

    await prisma.userProgram.delete({
      where: {
        id: userProgramId,
      },
    });

    return NextResponse.json({
      message: "Programa retirado del perfil correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar programa del perfil:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}