import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const notificationId = Number(id);

    if (!Number.isInteger(notificationId)) {
      return NextResponse.json(
        { message: "ID de notificación inválido" },
        { status: 400 }
      );
    }

    const notification =
      await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId: user.id,
        },
      });

    if (!notification) {
      return NextResponse.json(
        { message: "Notificación no encontrada" },
        { status: 404 }
      );
    }

    const updated =
      await prisma.notification.update({
        where: {
          id: notificationId,
        },
        data: {
          leida: true,
        },
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      "Error actualizando notificación:",
      error
    );

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}