import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { getUser } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

function canWriteComment(
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>,
  installation: {
    assignedSupportId: number | null;
    equipment: {
      userId: number | null; // <-- Cambiar a number | null
    };
  }
) {
  // ADMINISTRADOR puede comentar en cualquier instalación
  if (user.role === "ADMINISTRADOR") {
    return true;
  }

  // JEFE puede comentar en cualquier instalación
  if (user.role === "JEFE") {
    return true;
  }

  // SOPORTE solamente puede comentar
  // en sus propias instalaciones asignadas
  if (user.role === "SOPORTE") {
    return installation.assignedSupportId === user.id;
  }

  // INVITADO solamente puede comentar
  // en la instalación correspondiente a su equipo
  if (user.role === "INVITADO") {
    return installation.equipment.userId === user.id;
  }

  return false;
}

async function getInstallationAccess(
  installationId: number,
  user: Awaited<ReturnType<typeof getUser>>
) {
  if (!user) {
    return {
      allowed: false,
      status: 401,
      error: "No autenticado",
    };
  }

  const installation = await prisma.installation.findUnique({
    where: {
      id: installationId,
    },
    select: {
      id: true,
      status: true,
      assignedSupportId: true,
      equipment: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!installation) {
    return {
      allowed: false,
      status: 404,
      error: "Instalación no encontrada",
    };
  }

  // ADMINISTRADOR puede ver todo
  if (user.role === "ADMINISTRADOR") {
    return {
      allowed: true,
      installation,
    };
  }

  // JEFE puede ver todo
  if (user.role === "JEFE") {
    return {
      allowed: true,
      installation,
    };
  }

  // SOPORTE puede VER los comentarios
  // de cualquier instalación
  if (user.role === "SOPORTE") {
    return {
      allowed: true,
      installation,
    };
  }

  // INVITADO solamente puede ver
  // la instalación correspondiente a su equipo
  if (user.role === "INVITADO") {
    if (installation.equipment.userId !== user.id) {
      return {
        allowed: false,
        status: 403,
        error:
          "Solo puedes acceder a los comentarios de la instalación de tu equipo.",
      };
    }

    return {
      allowed: true,
      installation,
    };
  }

  return {
    allowed: false,
    status: 403,
    error: "No tienes permisos para acceder a esta instalación.",
  };
}

/**
 * GET
 *
 * Obtiene todos los comentarios de una instalación.
 *
 * Ya no se manejan respuestas anidadas.
 */
export async function GET(
  _request: Request,
  { params }: Params
) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "No autenticado",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;

    const installationId = Number(id);

    if (
      !Number.isInteger(installationId) ||
      installationId <= 0
    ) {
      return NextResponse.json(
        {
          error: "ID de instalación inválido",
        },
        {
          status: 400,
        }
      );
    }

    const access = await getInstallationAccess(
      installationId,
      user
    );

    if (!access.allowed) {
      return NextResponse.json(
        {
          error: access.error,
        },
        {
          status: access.status,
        }
      );
    }

    const comments = await prisma.comment.findMany({
      where: {
        installationId,
      },
      orderBy: {
        createdAt: "asc",
      },
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
    });

    return NextResponse.json(
      {
        comments,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Error obteniendo comentarios:",
      error
    );

    return NextResponse.json(
      {
        error: "Error interno del servidor",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * POST
 *
 * Crea un comentario.
 *
 * Las "respuestas" ahora son simplemente
 * nuevos comentarios dentro de la instalación.
 */
export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "No autenticado",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await context.params;

    const installationId = Number(id);

    if (
      !Number.isInteger(installationId) ||
      installationId <= 0
    ) {
      return NextResponse.json(
        {
          error: "ID de instalación inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const installation = await prisma.installation.findUnique({
      where: {
        id: installationId,
      },
      select: {
        id: true,
        status: true,
        assignedSupportId: true,
        equipment: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!installation) {
      return NextResponse.json(
        {
          error: "Instalación no encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Verificar si el usuario puede escribir
     * en esta instalación.
     */
    if (!canWriteComment(user, installation)) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para comentar en esta instalación.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * No se permiten comentarios cuando
     * la instalación ya terminó o fue cancelada.
     */
    if (
      installation.status === "COMPLETADA" ||
      installation.status === "CANCELADA"
    ) {
      return NextResponse.json(
        {
          error:
            "No se pueden agregar comentarios a una instalación finalizada.",
        },
        {
          status: 400,
        }
      );
    }

    const body = await request.json();

    const contenido =
      typeof body.contenido === "string"
        ? body.contenido.trim()
        : "";

    if (!contenido) {
      return NextResponse.json(
        {
          error: "El comentario no puede estar vacío.",
        },
        {
          status: 400,
        }
      );
    }

    if (contenido.length > 2000) {
      return NextResponse.json(
        {
          error:
            "El comentario no puede superar los 2000 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        contenido,
        userId: user.id,
        installationId,
        parentId: null,
      },
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
    });

    return NextResponse.json(
      {
        comment,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Error al crear comentario:",
      error
    );

    return NextResponse.json(
      {
        error: "No se pudo crear el comentario.",
      },
      {
        status: 500,
      }
    );
  }
}