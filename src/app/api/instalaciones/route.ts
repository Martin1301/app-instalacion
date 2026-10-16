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

    /**
     * Control de visibilidad:
     *
     * ADMINISTRADOR:
     * - Puede ver todas las instalaciones.
     *
     * JEFE:
     * - Puede ver todas las instalaciones.
     *
     * SOPORTE:
     * - Solo puede ver instalaciones asignadas a él.
     *
     * INVITADO:
     * - Solo puede ver instalaciones de equipos
     *   pertenecientes al usuario.
     */
    let where = {};


    if (user.role === "INVITADO") {
      where = {
        equipment: {
          userId: user.id,
        },
      };
    }

    const installations = await prisma.installation.findMany({
      where,

      orderBy: {
        createdAt: "desc",
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

        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    return NextResponse.json(installations);
  } catch (error) {
    console.error("Error obteniendo instalaciones:", error);

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 401 }
      );
    }

    /*
     * Solo ADMINISTRADOR y JEFE pueden crear instalaciones.
     */
    if (
      user.role !== "ADMINISTRADOR" &&
      user.role !== "JEFE"
    ) {
      return NextResponse.json(
        {
          message:
            "Solo ADMINISTRADOR o JEFE pueden crear instalaciones",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const equipmentId = Number(body.equipmentId);

    const priority = body.priority || "MEDIA";

    const type = body.type || "INSTALACION";

    const assignedSupportId = body.assignedSupportId
      ? Number(body.assignedSupportId)
      : null;

    const observaciones = body.observaciones
      ? String(body.observaciones).trim()
      : null;

    /*
     * Los programas seleccionados por el usuario.
     *
     * Ejemplo:
     *
     * programIds: [1, 4, 7]
     */
    const programIds: number[] = Array.isArray(body.programIds)
    ? body.programIds
        .map((id: unknown): number => Number(id))
        .filter((id: number) => Number.isInteger(id) && id > 0)
    : [];

    /*
     * Validar equipo.
     */
    if (
      !Number.isInteger(equipmentId) ||
      equipmentId <= 0
    ) {
      return NextResponse.json(
        { message: "El equipo es obligatorio" },
        { status: 400 }
      );
    }

    /*
     * Validar prioridad.
     */
    const validPriorities = [
      "BAJA",
      "MEDIA",
      "ALTA",
      "URGENTE",
    ];

    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { message: "Prioridad no válida" },
        { status: 400 }
      );
    }

    /*
     * Validar tipo de instalación.
     */
    const validTypes = [
      "INSTALACION",
      "REINSTALACION",
      "CORRECCION",
      "ACTUALIZACION",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { message: "Tipo de tarea no válido" },
        { status: 400 }
      );
    }

    /*
     * Debe existir al menos un programa seleccionado.
     */
    if (programIds.length === 0) {
      return NextResponse.json(
        {
          message:
            "Debes seleccionar al menos un programa para la tarea",
        },
        { status: 400 }
      );
    }

    /*
     * Eliminar IDs duplicados.
     */
    const uniqueProgramIds: number[] = [
      ...new Set<number>(programIds),
    ];

    /*
     * Buscar equipo.
     */
    const equipment = await prisma.equipment.findUnique({
      where: {
        id: equipmentId,
      },
      include: {
        user: true,
        area: true,
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { message: "El equipo no existe" },
        { status: 404 }
      );
    }

    /*
     * No se puede crear una instalación
     * para un equipo dado de baja.
     */
    if (equipment.status === "BAJA") {
      return NextResponse.json(
        {
          message:
            "No se puede crear una instalación para un equipo dado de baja",
        },
        { status: 400 }
      );
    }

    /*
     * El equipo debe tener un usuario asignado.
     */
    if (!equipment.userId || !equipment.user) {
      return NextResponse.json(
        {
          message:
            "El equipo debe estar asignado a un usuario antes de crear la instalación",
        },
        { status: 400 }
      );
    }

    /*
     * Buscar el perfil de programas.
     *
     * Primero:
     * Perfil específico del equipo.
     *
     * Si no existe:
     * Perfil general del usuario.
     */
    let profile = await prisma.userProgram.findMany({
      where: {
        userId: equipment.userId,
        equipmentId: equipment.id,
        program: {
          activo: true,
        },
      },
      include: {
        program: true,
      },
    });

    if (profile.length === 0) {
      profile = await prisma.userProgram.findMany({
        where: {
          userId: equipment.userId,
          equipmentId: null,
          program: {
            activo: true,
          },
        },
        include: {
          program: true,
        },
      });
    }

    /*
     * El usuario debe tener un perfil de programas.
     */
    if (profile.length === 0) {
      return NextResponse.json(
        {
          message:
            "El usuario no tiene un perfil de programas configurado para este equipo",
        },
        { status: 400 }
      );
    }

    /*
     * Validar que todos los programas seleccionados
     * pertenezcan al perfil disponible del usuario/equipo.
     */
    const availableProgramIds = profile.map(
      (item) => item.programId
    );

    const invalidProgramIds =
      uniqueProgramIds.filter(
        (programId) =>
          !availableProgramIds.includes(programId)
      );

    if (invalidProgramIds.length > 0) {
      return NextResponse.json(
        {
          message:
            "Uno o más programas seleccionados no pertenecen al perfil de programas del equipo",
        },
        { status: 400 }
      );
    }

    /*
     * Obtener únicamente los programas seleccionados.
     */
    const selectedPrograms = profile.filter((item) =>
      uniqueProgramIds.includes(item.programId)
    );

    /*
     * Validación adicional.
     */
    if (selectedPrograms.length === 0) {
      return NextResponse.json(
        {
          message:
            "No se encontraron programas válidos para crear la tarea",
        },
        { status: 400 }
      );
    }

    /*
     * Validar soporte seleccionado.
     *
     * Solo puede ser:
     * - rol SOPORTE
     * - estado ACTIVO
     */
    if (assignedSupportId) {
      const support = await prisma.user.findUnique({
        where: {
          id: assignedSupportId,
        },
        select: {
          id: true,
          username: true,
          nombres: true,
          apellidos: true,
          role: true,
          status: true,
        },
      });

      if (!support) {
        return NextResponse.json(
          {
            message:
              "El usuario de soporte no existe",
          },
          { status: 404 }
        );
      }

      if (support.role !== "SOPORTE") {
        return NextResponse.json(
          {
            message:
              "La instalación solo puede asignarse a un usuario con rol SOPORTE",
          },
          { status: 400 }
        );
      }

      if (support.status !== "ACTIVO") {
        return NextResponse.json(
          {
            message:
              "No se puede asignar la instalación a un soporte inactivo",
          },
          { status: 400 }
        );
      }
    }

    /*
     * Generar código:
     *
     * INST-20260917-0001
     */
    const date = new Date();

    const datePart =
      `${date.getFullYear()}` +
      `${String(date.getMonth() + 1).padStart(2, "0")}` +
      `${String(date.getDate()).padStart(2, "0")}`;

    const lastInstallation =
      await prisma.installation.findFirst({
        orderBy: {
          id: "desc",
        },
        select: {
          id: true,
        },
      });

    const sequence =
      (lastInstallation?.id ?? 0) + 1;

    const codigo =
      `INST-${datePart}-${String(sequence).padStart(4, "0")}`;

    /*
     * Crear instalación y SOLAMENTE los programas
     * seleccionados.
     */
    const installation =
      await prisma.installation.create({
        data: {
          codigo,

          type,

          status: assignedSupportId
            ? "ASIGNADA"
            : "PENDIENTE",

          priority,

          createdById: user.id,

          assignedSupportId,

          equipmentId,

          assignedAt: assignedSupportId
            ? new Date()
            : null,

          observaciones,

          installationPrograms: {
            create: selectedPrograms.map(
              (item) => ({
                programId: item.programId,
                status: "PENDIENTE",
                installed: false,
                configured: false,
              })
            ),
          },
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
        },
      });

    /*
     * Si fue asignada directamente a SOPORTE,
     * crear notificación.
     */
    if (assignedSupportId) {
      await prisma.notification.create({
        data: {
          userId: assignedSupportId,

          titulo: "Nueva tarea asignada",

          mensaje:
            `Se te ha asignado la tarea ${installation.codigo}.`,

          tipo: "INSTALACION_ASIGNADA",

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

        accion: "CREAR",

        entidad: "Installation",

        entidadId: installation.id,

        descripcion:
          `Se creó la tarea ${installation.codigo}`,

        datos: {
          equipmentId,
          assignedSupportId,
          priority,
          type,

          programs:
            selectedPrograms.map(
              (item) => item.program.nombre
            ),
        },
      },
    });

    return NextResponse.json(
      {
        message:
          "Tarea creada correctamente",

        installation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Error creando instalación:",
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