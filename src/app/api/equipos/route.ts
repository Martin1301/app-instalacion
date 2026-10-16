import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

const EQUIPMENT_STATUSES = [
  "ACTIVO",
  "INACTIVO",
  "MANTENIMIENTO",
  "BAJA",
] as const;

export async function GET() {
  try {
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // ============================================
    // FILTRO DE EQUIPOS SEGÚN EL ROL
    // ============================================

    const where =
      currentUser.role === "INVITADO"
        ? {
            userId: Number(currentUser.id),
          }
        : {};

    const equipos = await prisma.equipment.findMany({
      where,

      orderBy: {
        codigo: "asc",
      },

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

        _count: {
          select: {
            installations: true,
            userPrograms: true,
          },
        },
      },
    });

    return NextResponse.json(equipos);
  } catch (error) {
    console.error("Error al obtener equipos:", error);

    return NextResponse.json(
      { error: "Error interno al obtener los equipos" },
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
        { error: "No tienes permisos para registrar equipos" },
        { status: 403 }
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
    // VALIDACIONES BÁSICAS
    // ============================

    if (!codigo || !String(codigo).trim()) {
      return NextResponse.json(
        { error: "El código del equipo es obligatorio" },
        { status: 400 }
      );
    }

    if (!hostname || !String(hostname).trim()) {
      return NextResponse.json(
        { error: "El hostname es obligatorio" },
        { status: 400 }
      );
    }

    if (!ip || !String(ip).trim()) {
      return NextResponse.json(
        { error: "La dirección IP es obligatoria" },
        { status: 400 }
      );
    }

    // ============================
    // VALIDAR ESTADO
    // ============================

    const equipmentStatus = status || "ACTIVO";

    if (!EQUIPMENT_STATUSES.includes(equipmentStatus)) {
      return NextResponse.json(
        {
          error:
            "El estado del equipo no es válido",
        },
        { status: 400 }
      );
    }

    // ============================
    // VALIDAR DUPLICADOS
    // ============================

    const existingEquipment = await prisma.equipment.findFirst({
      where: {
        OR: [
          {
            codigo: String(codigo).trim(),
          },
          {
            hostname: String(hostname).trim(),
          },
        ],
      },
      select: {
        id: true,
        codigo: true,
        hostname: true,
      },
    });

    if (existingEquipment) {
      if (existingEquipment.codigo === String(codigo).trim()) {
        return NextResponse.json(
          {
            error: `Ya existe un equipo con el código "${codigo}"`,
          },
          { status: 409 }
        );
      }

      if (
        existingEquipment.hostname ===
        String(hostname).trim()
      ) {
        return NextResponse.json(
          {
            error: `Ya existe un equipo con el hostname "${hostname}"`,
          },
          { status: 409 }
        );
      }
    }

    // ============================
    // VALIDAR USUARIO
    // ============================

    let validatedUserId: number | null = null;

    if (
      userId !== undefined &&
      userId !== null &&
      userId !== ""
    ) {
      validatedUserId = Number(userId);

      if (!Number.isInteger(validatedUserId)) {
        return NextResponse.json(
          { error: "El usuario seleccionado no es válido" },
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
          { error: "El usuario seleccionado no existe" },
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

      if (user.equipment) {
        return NextResponse.json(
          {
            error: `El usuario ${user.nombres} ${user.apellidos} ya tiene asignado el equipo ${user.equipment.codigo}`,
          },
          { status: 409 }
        );
      }
    }

    // ============================
    // VALIDAR ÁREA
    // ============================

    let validatedAreaId: number | null = null;

    if (
      areaId !== undefined &&
      areaId !== null &&
      areaId !== ""
    ) {
      validatedAreaId = Number(areaId);

      if (!Number.isInteger(validatedAreaId)) {
        return NextResponse.json(
          { error: "El área seleccionada no es válida" },
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
          { error: "El área seleccionada no existe" },
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

    // ============================
    // CREAR EQUIPO
    // ============================

    const equipo = await prisma.equipment.create({
      data: {
        codigo: String(codigo).trim(),
        hostname: String(hostname).trim(),
        ip: String(ip).trim(),

        marca:
          marca && String(marca).trim()
            ? String(marca).trim()
            : null,

        modelo:
          modelo && String(modelo).trim()
            ? String(modelo).trim()
            : null,

        numeroSerie:
          numeroSerie && String(numeroSerie).trim()
            ? String(numeroSerie).trim()
            : null,

        sistemaOperativo:
          sistemaOperativo &&
          String(sistemaOperativo).trim()
            ? String(sistemaOperativo).trim()
            : null,

        status: equipmentStatus,

        ubicacion:
          ubicacion && String(ubicacion).trim()
            ? String(ubicacion).trim()
            : null,

        observaciones:
          observaciones && String(observaciones).trim()
            ? String(observaciones).trim()
            : null,

        user:
          validatedUserId
            ? {
                connect: {
                  id: validatedUserId,
                },
              }
            : undefined,

        area:
          validatedAreaId
            ? {
                connect: {
                  id: validatedAreaId,
                },
              }
            : undefined,
      },

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

    return NextResponse.json(equipo, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear equipo:", error);

    // Protección adicional contra restricciones únicas
    if (error?.code === "P2002") {
      const fields = error?.meta?.target;

      if (Array.isArray(fields)) {
        if (fields.includes("codigo")) {
          return NextResponse.json(
            {
              error: "Ya existe un equipo con ese código",
            },
            { status: 409 }
          );
        }

        if (fields.includes("hostname")) {
          return NextResponse.json(
            {
              error: "Ya existe un equipo con ese hostname",
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
      { error: "Error interno al registrar el equipo" },
      { status: 500 }
    );
  }
}