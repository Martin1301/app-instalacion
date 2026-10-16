import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

const EQUIPMENT_STATUSES = [
  "ACTIVO",
  "INACTIVO",
  "MANTENIMIENTO",
  "BAJA",
] as const;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
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
        {
          error:
            "No tienes permisos para modificar equipos",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const equipmentId = Number(id);

    if (!Number.isInteger(equipmentId)) {
      return NextResponse.json(
        { error: "ID de equipo no válido" },
        { status: 400 }
      );
    }

    const existingEquipment =
      await prisma.equipment.findUnique({
        where: {
          id: equipmentId,
        },
      });

    if (!existingEquipment) {
      return NextResponse.json(
        { error: "El equipo no existe" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const {
      codigo,
      hostname,
      ip,
      marca,
      modelo,
      numeroSerie,
      sistemaOperativo,
      status,
      ubicacion,
      observaciones,
      userId,
      areaId,
    } = body;

    // ============================
    // VALIDACIONES
    // ============================

    if (
      codigo !== undefined &&
      !String(codigo).trim()
    ) {
      return NextResponse.json(
        { error: "El código no puede estar vacío" },
        { status: 400 }
      );
    }

    if (
      hostname !== undefined &&
      !String(hostname).trim()
    ) {
      return NextResponse.json(
        { error: "El hostname no puede estar vacío" },
        { status: 400 }
      );
    }

    if (
      ip !== undefined &&
      !String(ip).trim()
    ) {
      return NextResponse.json(
        { error: "La dirección IP no puede estar vacía" },
        { status: 400 }
      );
    }

    // ============================
    // VALIDAR ESTADO
    // ============================

    if (
      status !== undefined &&
      !EQUIPMENT_STATUSES.includes(status)
    ) {
      return NextResponse.json(
        { error: "El estado del equipo no es válido" },
        { status: 400 }
      );
    }

    // ============================
    // VALIDAR DUPLICADOS
    // ============================

    if (
      codigo !== undefined ||
      hostname !== undefined
    ) {
      const duplicate = await prisma.equipment.findFirst({
        where: {
          AND: [
            {
              id: {
                not: equipmentId,
              },
            },
            {
              OR: [
                codigo !== undefined
                  ? {
                      codigo: String(codigo).trim(),
                    }
                  : undefined,
                hostname !== undefined
                  ? {
                      hostname: String(hostname).trim(),
                    }
                  : undefined,
              ].filter(Boolean) as any,
            },
          ],
        },
        select: {
          id: true,
          codigo: true,
          hostname: true,
        },
      });

      if (duplicate) {
        if (
          codigo !== undefined &&
          duplicate.codigo === String(codigo).trim()
        ) {
          return NextResponse.json(
            {
              error: `Ya existe otro equipo con el código "${codigo}"`,
            },
            { status: 409 }
          );
        }

        if (
          hostname !== undefined &&
          duplicate.hostname ===
            String(hostname).trim()
        ) {
          return NextResponse.json(
            {
              error: `Ya existe otro equipo con el hostname "${hostname}"`,
            },
            { status: 409 }
          );
        }
      }
    }

    // ============================
    // VALIDAR USUARIO
    // ============================

    let validatedUserId:
      | number
      | null
      | undefined = undefined;

    if (userId !== undefined) {
      if (
        userId === null ||
        userId === ""
      ) {
        validatedUserId = null;
      } else {
        validatedUserId = Number(userId);

        if (!Number.isInteger(validatedUserId)) {
          return NextResponse.json(
            {
              error:
                "El usuario seleccionado no es válido",
            },
            { status: 400 }
          );
        }

        const user = await prisma.user.findUnique({
          where: {
            id: validatedUserId,
          },
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            status: true,
            equipment: {
              select: {
                id: true,
                codigo: true,
              },
            },
          },
        });

        if (!user) {
          return NextResponse.json(
            {
              error:
                "El usuario seleccionado no existe",
            },
            { status: 404 }
          );
        }

        if (user.status !== "ACTIVO") {
          return NextResponse.json(
            {
              error:
                "No se puede asignar el equipo a un usuario inactivo",
            },
            { status: 400 }
          );
        }

        if (
          user.equipment &&
          user.equipment.id !== equipmentId
        ) {
          return NextResponse.json(
            {
              error: `El usuario ${user.nombres} ${user.apellidos} ya tiene asignado el equipo ${user.equipment.codigo}`,
            },
            { status: 409 }
          );
        }
      }
    }

    // ============================
    // VALIDAR ÁREA
    // ============================

    let validatedAreaId:
      | number
      | null
      | undefined = undefined;

    if (areaId !== undefined) {
      if (
        areaId === null ||
        areaId === ""
      ) {
        validatedAreaId = null;
      } else {
        validatedAreaId = Number(areaId);

        if (!Number.isInteger(validatedAreaId)) {
          return NextResponse.json(
            {
              error:
                "El área seleccionada no es válida",
            },
            { status: 400 }
          );
        }

        const area = await prisma.area.findUnique({
          where: {
            id: validatedAreaId,
          },
          select: {
            id: true,
            nombre: true,
            estado: true,
          },
        });

        if (!area) {
          return NextResponse.json(
            {
              error: "El área seleccionada no existe",
            },
            { status: 404 }
          );
        }

        if (!area.estado) {
          return NextResponse.json(
            {
              error:
                "No se puede asignar el equipo a un área inactiva",
            },
            { status: 400 }
          );
        }
      }
    }

    // ============================
    // PREPARAR DATOS
    // ============================

    const data: any = {};

    if (codigo !== undefined) {
      data.codigo = String(codigo).trim();
    }

    if (hostname !== undefined) {
      data.hostname = String(hostname).trim();
    }

    if (ip !== undefined) {
      data.ip = String(ip).trim();
    }

    if (marca !== undefined) {
      data.marca =
        marca && String(marca).trim()
          ? String(marca).trim()
          : null;
    }

    if (modelo !== undefined) {
      data.modelo =
        modelo && String(modelo).trim()
          ? String(modelo).trim()
          : null;
    }

    if (numeroSerie !== undefined) {
      data.numeroSerie =
        numeroSerie && String(numeroSerie).trim()
          ? String(numeroSerie).trim()
          : null;
    }

    if (sistemaOperativo !== undefined) {
      data.sistemaOperativo =
        sistemaOperativo &&
        String(sistemaOperativo).trim()
          ? String(sistemaOperativo).trim()
          : null;
    }

    if (status !== undefined) {
      data.status = status;
    }

    if (ubicacion !== undefined) {
      data.ubicacion =
        ubicacion && String(ubicacion).trim()
          ? String(ubicacion).trim()
          : null;
    }

    if (observaciones !== undefined) {
      data.observaciones =
        observaciones &&
        String(observaciones).trim()
          ? String(observaciones).trim()
          : null;
    }

    // ============================
    // RELACIÓN USUARIO
    // ============================

    if (validatedUserId !== undefined) {
      if (validatedUserId === null) {
        data.user = {
          disconnect: true,
        };
      } else {
        data.user = {
          connect: {
            id: validatedUserId,
          },
        };
      }
    }

    // ============================
    // RELACIÓN ÁREA
    // ============================

    if (validatedAreaId !== undefined) {
      if (validatedAreaId === null) {
        data.area = {
          disconnect: true,
        };
      } else {
        data.area = {
          connect: {
            id: validatedAreaId,
          },
        };
      }
    }

    // ============================
    // ACTUALIZAR
    // ============================

    const equipo = await prisma.equipment.update({
      where: {
        id: equipmentId,
      },

      data,

      include: {
        user: {
          select: {
            id: true,
            username: true,
            nombres: true,
            apellidos: true,
            email: true,
            role: true,
            status: true,
          },
        },

        area: {
          select: {
            id: true,
            nombre: true,
            estado: true,
          },
        },
      },
    });

    return NextResponse.json(equipo);
  } catch (error: any) {
    console.error("Error al actualizar equipo:", error);

    if (error?.code === "P2002") {
      const fields = error?.meta?.target;

      if (Array.isArray(fields)) {
        if (fields.includes("codigo")) {
          return NextResponse.json(
            {
              error:
                "Ya existe un equipo con ese código",
            },
            { status: 409 }
          );
        }

        if (fields.includes("hostname")) {
          return NextResponse.json(
            {
              error:
                "Ya existe un equipo con ese hostname",
            },
            { status: 409 }
          );
        }

        if (fields.includes("userId")) {
          return NextResponse.json(
            {
              error:
                "El usuario seleccionado ya tiene un equipo asignado",
            },
            { status: 409 }
          );
        }
      }
    }

    return NextResponse.json(
      {
        error:
          "Error interno al actualizar el equipo",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
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
        {
          error:
            "No tienes permisos para eliminar equipos",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const equipmentId = Number(id);

    if (!Number.isInteger(equipmentId)) {
      return NextResponse.json(
        { error: "ID de equipo no válido" },
        { status: 400 }
      );
    }

    const equipo = await prisma.equipment.findUnique({
      where: {
        id: equipmentId,
      },
      include: {
        installations: {
          select: {
            id: true,
            codigo: true,
          },
        },
        userPrograms: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!equipo) {
      return NextResponse.json(
        { error: "El equipo no existe" },
        { status: 404 }
      );
    }

    // No eliminar equipos que ya tengan historial
    if (equipo.installations.length > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el equipo porque tiene instalaciones registradas. Puedes cambiar su estado a BAJA.",
        },
        { status: 409 }
      );
    }

    // Si tiene programas asociados, tampoco eliminarlo
    if (equipo.userPrograms.length > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el equipo porque tiene programas asociados. Puedes cambiar su estado a BAJA.",
        },
        { status: 409 }
      );
    }

    await prisma.equipment.delete({
      where: {
        id: equipmentId,
      },
    });

    return NextResponse.json({
      message: "Equipo eliminado correctamente",
    });
  } catch (error: any) {
    console.error("Error al eliminar equipo:", error);

    return NextResponse.json(
      {
        error:
          "Error interno al eliminar el equipo",
      },
      { status: 500 }
    );
  }
}