import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 401 }
      );
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const noLeidas = notifications.filter(
      (notification) => !notification.leida
    ).length;

    return NextResponse.json({
      notifications,
      noLeidas,
    });
  } catch (error) {
    console.error(
      "Error obteniendo notificaciones:",
      error
    );

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}