import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: Params
) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 401 }
      );
    }

    /*
     * PERMISOS
     *
     * ADMINISTRADOR:
     * Puede finalizar cualquier instalación.
     *
     * SOPORTE:
     * Solo puede finalizar una instalación
     * que esté asignada a su usuario.
     *
     * JEFE:
     * No finaliza instalaciones.
     *
     * INVITADO:
     * No finaliza instalaciones.
     */

    if (
      user.role !== "ADMINISTRADOR" &&
      user.role !== "SOPORTE"
    ) {
      return NextResponse.json(
        {
          message:
            "No tienes permisos para finalizar instalaciones",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const installationId = Number(id);

    if (
      !installationId ||
      Number.isNaN(installationId)
    ) {
      return NextResponse.json(
        {
          message: "ID de instalación inválido",
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const finalComment =
      String(body.finalComment ?? "").trim();

    /*
     * Buscamos la instalación completa antes de finalizarla.
     */

    const installation =
      await prisma.installation.findUnique({
        where: {
          id: installationId,
        },

        include: {
          equipment: {
            include: {
              user: true,
              area: true,
            },
          },

          createdBy: {
            select: {
              id: true,
              username: true,
              nombres: true,
              apellidos: true,
              role: true,
            },
          },

          assignedSupport: {
            select: {
              id: true,
              username: true,
              nombres: true,
              apellidos: true,
              role: true,
            },
          },

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
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  nombres: true,
                  apellidos: true,
                  role: true,
                },
              },

              replies: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      nombres: true,
                      apellidos: true,
                      role: true,
                    },
                  },
                },

                orderBy: {
                  createdAt: "asc",
                },
              },
            },

            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    if (!installation) {
      return NextResponse.json(
        {
          message: "Instalación no encontrada",
        },
        { status: 404 }
      );
    }

    /*
     * SOPORTE solo puede trabajar con instalaciones
     * que estén asignadas a él.
     *
     * ADMINISTRADOR puede finalizar cualquiera.
     */

    if (
      user.role === "SOPORTE" &&
      installation.assignedSupportId !== user.id
    ) {
      return NextResponse.json(
        {
          message:
            "Esta instalación no está asignada a tu usuario",
        },
        { status: 403 }
      );
    }

    /*
     * No se puede finalizar una instalación
     * que ya está completada.
     */

    if (installation.status === "COMPLETADA") {
      return NextResponse.json(
        {
          message:
            "La instalación ya está completada",
        },
        { status: 400 }
      );
    }

    /*
     * No se puede finalizar una instalación cancelada.
     */

    if (installation.status === "CANCELADA") {
      return NextResponse.json(
        {
          message:
            "La instalación está cancelada",
        },
        { status: 400 }
      );
    }

    /*
     * TODOS los programas deben estar:
     *
     * 1. Instalados
     * 2. Configurados
     */

    const pendingPrograms =
      installation.installationPrograms.filter(
        (item) =>
          !item.installed ||
          !item.configured
      );

    if (pendingPrograms.length > 0) {
      return NextResponse.json(
        {
          message:
            "No se puede finalizar la instalación porque existen programas pendientes",

          pendingPrograms:
            pendingPrograms.map((item) => ({
              id: item.id,
              programId: item.programId,
              nombre: item.program.nombre,
              installed: item.installed,
              configured: item.configured,
              status: item.status,
            })),
        },
        { status: 400 }
      );
    }

    /*
     * SOPORTE debe dejar un comentario final.
     *
     * ADMINISTRADOR puede finalizar aunque
     * no escriba comentario, porque tiene permisos
     * completos sobre la plataforma.
     */

    if (
      user.role === "SOPORTE" &&
      !finalComment
    ) {
      return NextResponse.json(
        {
          message:
            "Debes ingresar un comentario final antes de cerrar la instalación",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    /*
     * Guardamos la instalación como COMPLETADA.
     *
     * Importante:
     * Incluimos createdBy porque el frontend
     * necesita esa relación después de finalizar.
     */

    const updated =
      await prisma.installation.update({
        where: {
          id: installation.id,
        },

        data: {
          status: "COMPLETADA",
          completedAt: now,

          finalComment:
            finalComment ||
            installation.finalComment ||
            null,
        },

        include: {
          equipment: {
            include: {
              user: true,
              area: true,
            },
          },

          createdBy: {
            select: {
              id: true,
              username: true,
              nombres: true,
              apellidos: true,
              role: true,
            },
          },

          assignedSupport: {
            select: {
              id: true,
              username: true,
              nombres: true,
              apellidos: true,
              role: true,
            },
          },

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
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  nombres: true,
                  apellidos: true,
                  role: true,
                },
              },

              replies: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      nombres: true,
                      apellidos: true,
                      role: true,
                    },
                  },
                },

                orderBy: {
                  createdAt: "asc",
                },
              },
            },

            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    /*
     * Si existe comentario final,
     * también lo guardamos en el historial.
     */

    if (finalComment) {
      await prisma.comment.create({
        data: {
          contenido: finalComment,
          userId: user.id,
          installationId: installation.id,
        },
      });
    }

    /*
     * Notificamos al usuario propietario del equipo.
     */

    if (installation.equipment.userId) {
      await prisma.notification.create({
        data: {
          userId: installation.equipment.userId,

          titulo: "Instalación completada",

          mensaje:
            `La instalación ${installation.codigo} ` +
            `ha sido completada.`,

          tipo: "INSTALACION_COMPLETADA",

          installationId: installation.id,
        },
      });
    }

    /*
     * Auditoría.
     */

    await prisma.auditLog.create({
      data: {
        userId: user.id,

        accion: "FINALIZAR",

        entidad: "Installation",

        entidadId: installation.id,

        descripcion:
          `Se completó la instalación ${installation.codigo}`,

        datos: {
          completedAt: now.toISOString(),

          finalComment,

          programs:
            installation.installationPrograms.map(
              (item) => item.program.nombre
            ),
        },
      },
    });

    /*
     * Devolvemos la instalación completa.
     */

    return NextResponse.json({
      message:
        "Instalación completada correctamente",

      installation: updated,
    });
  } catch (error) {
    console.error(
      "Error finalizando instalación:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}