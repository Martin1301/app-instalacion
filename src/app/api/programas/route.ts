import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const programas = await prisma.program.findMany({
      orderBy: {
        nombre: "asc",
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

    return NextResponse.json(programas);
  } catch (error) {
    console.error("Error al obtener programas:", error);

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

    if (currentUser.role !== "ADMINISTRADOR") {
      return NextResponse.json(
        { error: "No tienes permisos para crear programas" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim();
    const version = String(body.version ?? "").trim();

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre del programa es obligatorio" },
        { status: 400 }
      );
    }

    const existente = await prisma.program.findUnique({
      where: {
        nombre,
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe un programa con ese nombre" },
        { status: 409 }
      );
    }

    const programa = await prisma.program.create({
      data: {
        nombre,
        descripcion: descripcion || null,
        version: version || null,
      },
    });

    return NextResponse.json(programa, { status: 201 });
  } catch (error) {
    console.error("Error al crear programa:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}