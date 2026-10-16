import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteParams
) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        {
          message: "No autenticado",
        },
        {
          status: 401,
        }
      );
    }

    const { id: idParam } = await context.params;
    const id = Number(idParam);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        {
          message: "ID de instalación inválido",
        },
        {
          status: 400,
        }
      );
    }

    const installation =
      await prisma.installation.findUnique({
        where: {
          id,
        },
        include: {
          equipment: {
            include: {
              user: true,
              area: true,
            },
          },

          createdBy: true,

          assignedSupport: true,

          installationPrograms: {
            include: {
              program: true,
            },
            orderBy: {
              program: {
                nombre: "asc",
              },
            },
          },

          comments: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              user: true,
            },
          },
        },
      });

    if (!installation) {
      return NextResponse.json(
        {
          message: "La instalación no existe.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * REGLA DE ACCESO
     * =====================================================
     *
     * Mientras la instalación no esté completada:
     *
     *   - Solo puede entrar el SOPORTE asignado.
     *
     * Cuando esté COMPLETADA:
     *
     *   - Cualquier usuario autenticado puede consultarla.
     */

    const isCompleted =
      installation.status === "COMPLETADA";

    const isAssignedSupport =
      user.role === "SOPORTE" &&
      installation.assignedSupportId === user.id;

    const canView =
      isCompleted ||
      user.role === "ADMINISTRADOR" ||
      user.role === "JEFE" ||
      isAssignedSupport;

    if (!canView) {
      return NextResponse.json(
        {
          message:
            "Esta instalación todavía está en proceso y solo puede ser consultada por el soporte asignado.",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.json(
      installation,
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Error obteniendo instalación:",
      error
    );

    return NextResponse.json(
      {
        message:
          "No se pudo cargar la instalación.",
      },
      {
        status: 500,
      }
    );
  }
}