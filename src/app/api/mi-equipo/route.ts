import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // =========================================================
    // AUTENTICACIÓN
    // =========================================================

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

    // =========================================================
    // VERIFICAR QUE EL USUARIO EXISTA
    // =========================================================

    const currentUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Usuario no encontrado",
        },
        {
          status: 404,
        }
      );
    }

    // =========================================================
    // OBTENER EQUIPO ASIGNADO AL USUARIO
    // =========================================================

    const equipment = await prisma.equipment.findFirst({
      where: {
        userId: currentUser.id,
      },
      select: {
        id: true,
        codigo: true,
        hostname: true,
        ip: true,
        marca: true,
        modelo: true,
        numeroSerie: true,
        sistemaOperativo: true,
        status: true,
        ubicacion: true,
        observaciones: true,

        area: {
          select: {
            id: true,
            nombre: true,
          },
        },

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
      },
    });

    // =========================================================
    // SI EL USUARIO NO TIENE EQUIPO
    // =========================================================

    if (!equipment) {
      return NextResponse.json({
        equipment: null,

        programs: [],

        installations: [],

        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },

        stats: {
          totalInstallations: 0,
          completedInstallations: 0,
        },
      });
    }

    // =========================================================
    // PAGINACIÓN Y BÚSQUEDA
    // =========================================================

    const searchParams = request.nextUrl.searchParams;

    const requestedPage = Number(
      searchParams.get("page") ?? "1"
    );

    const requestedLimit = Number(
      searchParams.get("limit") ?? "10"
    );

    const search =
      searchParams.get("search")?.trim() ?? "";

    const page =
      Number.isFinite(requestedPage) &&
      requestedPage >= 1
        ? Math.floor(requestedPage)
        : 1;

    const limit =
      Number.isFinite(requestedLimit) &&
      requestedLimit >= 1
        ? Math.min(Math.floor(requestedLimit), 50)
        : 10;

    // =========================================================
// PROGRAMAS ACTUALES DEL USUARIO
// =========================================================

const userPrograms =
  await prisma.userProgram.findMany({
    where: {
      userId: currentUser.id,

      OR: [
        {
          equipmentId: equipment.id,
        },
        {
          equipmentId: null,
        },
      ],
    },

    select: {
      id: true,
      programId: true,
      equipmentId: true,
      observaciones: true,

      program: {
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          version: true,
          activo: true,
        },
      },
    },

    orderBy: {
      program: {
        nombre: "asc",
      },
    },
  });

    // =========================================================
// ELIMINAR PROGRAMAS DUPLICADOS
//
// Si existe el mismo programa:
//
// 1. Programa asignado al perfil
// 2. Programa específico del equipo
//
// Se conserva el específico del equipo.
// =========================================================

const programsMap = new Map<
  number,
  (typeof userPrograms)[number]
>();

for (const item of userPrograms) {
  const existing = programsMap.get(
    item.programId
  );

  if (!existing) {
    programsMap.set(item.programId, item);
    continue;
  }

  const currentIsSpecific =
    item.equipmentId === equipment.id;

  const existingIsSpecific =
    existing.equipmentId === equipment.id;

  if (
    currentIsSpecific &&
    !existingIsSpecific
  ) {
    programsMap.set(item.programId, item);
  }
}

const programs = Array.from(
  programsMap.values()
).sort((a, b) =>
  a.program.nombre.localeCompare(
    b.program.nombre,
    "es"
  )
);

    // =========================================================
    // IDS DE LOS PROGRAMAS ACTUALES
    // =========================================================

    const currentProgramIds = programs.map(
      (item) => item.programId
    );

    // =========================================================
    // FILTRO DEL HISTORIAL
    // =========================================================

    const installationWhere = {
      equipmentId: equipment.id,

      ...(search
        ? {
            codigo: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };

    // =========================================================
    // ESTADÍSTICAS GLOBALES
    //
    // Estas estadísticas corresponden a TODO el historial
    // del equipo, no solamente a la página actual.
    // =========================================================

    const [
      totalInstallations,
      completedInstallations,
    ] = await Promise.all([
      prisma.installation.count({
        where: installationWhere,
      }),

      prisma.installation.count({
        where: {
          ...installationWhere,
          status: "COMPLETADA",
        },
      }),
    ]);

    // =========================================================
    // CALCULAR TOTAL DE PÁGINAS
    // =========================================================

    const totalPages =
      totalInstallations > 0
        ? Math.ceil(
            totalInstallations / limit
          )
        : 0;

    // =========================================================
    // ASEGURAR PÁGINA VÁLIDA
    // =========================================================

    const safePage =
      totalPages > 0
        ? Math.min(page, totalPages)
        : 1;

    const skip =
      (safePage - 1) * limit;

    // =========================================================
    // OBTENER HISTORIAL PAGINADO
    // =========================================================

    const installationHistory =
      await prisma.installation.findMany({
        where: installationWhere,

        skip,

        take: limit,

        select: {
          id: true,
          codigo: true,
          status: true,
          priority: true,
          createdAt: true,
          completedAt: true,

          installationPrograms: {
            orderBy: {
              program: {
                nombre: "asc",
              },
            },

            select: {
              id: true,
              programId: true,
              status: true,
              installed: true,
              configured: true,
              observaciones: true,
              installedAt: true,
              configuredAt: true,

              program: {
                select: {
                  id: true,
                  nombre: true,
                  descripcion: true,
                  version: true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    // =========================================================
    // FORMATEAR HISTORIAL
    // =========================================================

    const installations =
      installationHistory.map(
        (installation) => {
          const installationProgramIds =
            installation.installationPrograms.map(
              (item) => item.programId
            );

          const isComplete =
            currentProgramIds.length > 0 &&
            currentProgramIds.length ===
              installationProgramIds.length &&
            currentProgramIds.every(
              (id) =>
                installationProgramIds.includes(id)
            );

          return {
            id: installation.id,
            codigo: installation.codigo,
            status: installation.status,
            priority: installation.priority,

            createdAt:
              installation.createdAt,

            completedAt:
              installation.completedAt,

            date:
              installation.completedAt ??
              installation.createdAt,

            scope: isComplete
              ? "TODOS"
              : "ALGUNOS",

            programCount:
              installation
                .installationPrograms.length,

            installationPrograms:
              installation.installationPrograms,
          };
        }
      );

    // =========================================================
    // RESPUESTA
    // =========================================================

    return NextResponse.json({
      equipment,

      programs,

      installations,

      pagination: {
        page: safePage,
        limit,
        total: totalInstallations,
        totalPages,
      },

      stats: {
        totalInstallations,
        completedInstallations,
      },
    });
  } catch (error) {
    // =========================================================
    // ERROR
    // =========================================================

    console.error(
      "========================================"
    );

    console.error(
      "ERROR EN GET /api/mi-equipo"
    );

    console.error(error);

    console.error(
      "========================================"
    );

    return NextResponse.json(
      {
        error:
          "No se pudo obtener la información de Mi equipo",
      },
      {
        status: 500,
      }
    );
  }
}