import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const areas = await prisma.area.findMany({
      orderBy: {
        nombre: "asc",
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

    return NextResponse.json(areas);
  } catch (error) {
    console.error("Error al obtener áreas:", error);

    return NextResponse.json(
      { error: "Error al obtener las áreas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
        { error: "No tienes permisos para crear áreas" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const nombre = String(body.nombre || "").trim();
    const descripcion = String(body.descripcion || "").trim();

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre del área es obligatorio" },
        { status: 400 }
      );
    }

    const existente = await prisma.area.findUnique({
      where: {
        nombre,
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe un área con ese nombre" },
        { status: 409 }
      );
    }

    const area = await prisma.area.create({
      data: {
        nombre,
        descripcion: descripcion || null,
      },
    });

    return NextResponse.json(area, { status: 201 });
  } catch (error) {
    console.error("Error al crear área:", error);

    return NextResponse.json(
      { error: "Error al crear el área" },
      { status: 500 }
    );
  }
}