import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
    programId: string;
  }>;
};

export async function PATCH(
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

    const { id, programId } = await params;

    const installationId = Number(id);
    const installationProgramId = Number(programId);

    if (
      !installationId ||
      Number.isNaN(installationId) ||
      !installationProgramId ||
      Number.isNaN(installationProgramId)
    ) {
      return NextResponse.json(
        { message: "Identificadores inválidos" },
        { status: 400 }
      );
    }

    const installation = await prisma.installation.findUnique({
      where: {
        id: installationId,
      },
    });

    if (!installation) {
      return NextResponse.json(
        { message: "Instalación no encontrada" },
        { status: 404 }
      );
    }

    /*
     * PERMISOS
     *
     * ADMINISTRADOR:
     * Puede modificar cualquier instalación.
     *
     * SOPORTE:
     * Solo puede modificar instalaciones que
     * estén asignadas a su usuario.
     *
     * JEFE:
     * No modifica el progreso de los programas.
     *
     * INVITADO:
     * No modifica el progreso de los programas.
     */

    if (user.role !== "SOPORTE") {
  return NextResponse.json(
    {
      message:
        "Solo el soporte asignado puede actualizar los programas de esta instalación",
    },
    { status: 403 }
  );
}

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
     * Una instalación completada o cancelada
     * ya no puede ser modificada.
     *
     * ADMINISTRADOR también respeta esta regla
     * desde este endpoint para mantener el historial
     * de la instalación consistente.
     */

    if (
      installation.status === "COMPLETADA" ||
      installation.status === "CANCELADA"
    ) {
      return NextResponse.json(
        {
          message:
            "No se puede modificar una instalación finalizada o cancelada",
        },
        { status: 400 }
      );
    }

    const installationProgram =
      await prisma.installationProgram.findFirst({
        where: {
          id: installationProgramId,
          installationId,
        },
        include: {
          program: true,
        },
      });

    if (!installationProgram) {
      return NextResponse.json(
        {
          message:
            "Programa no encontrado en esta instalación",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    const installed =
      typeof body.installed === "boolean"
        ? body.installed
        : undefined;

    const configured =
      typeof body.configured === "boolean"
        ? body.configured
        : undefined;

    const observaciones =
      body.observaciones !== undefined
        ? String(body.observaciones).trim() || null
        : undefined;

    /*
     * Calculamos los valores finales.
     */

    const finalInstalled =
      installed !== undefined
        ? installed
        : installationProgram.installed;

    const finalConfigured =
      configured !== undefined
        ? configured
        : installationProgram.configured;

    /*
     * Un programa no puede estar configurado
     * si todavía no está instalado.
     */

    if (finalConfigured && !finalInstalled) {
      return NextResponse.json(
        {
          message:
            "No puedes marcar un programa como configurado si no está instalado",
        },
        { status: 400 }
      );
    }

    /*
     * Determinamos el estado del programa.
     */

    let status:
      | "PENDIENTE"
      | "INSTALANDO"
      | "INSTALADO"
      | "CONFIGURADO";

    if (finalConfigured) {
      status = "CONFIGURADO";
    } else if (finalInstalled) {
      status = "INSTALADO";
    } else if (
      installed !== undefined ||
      configured !== undefined
    ) {
      status = "INSTALANDO";
    } else {
      status = installationProgram.status;
    }

    const now = new Date();

    /*
     * Actualizamos el programa.
     */

    const updated =
      await prisma.installationProgram.update({
        where: {
          id: installationProgram.id,
        },

        data: {
          installed: finalInstalled,
          configured: finalConfigured,
          status,

          installedAt: finalInstalled
            ? installationProgram.installedAt ?? now
            : null,

          configuredAt: finalConfigured
            ? installationProgram.configuredAt ?? now
            : null,

          ...(observaciones !== undefined
            ? { observaciones }
            : {}),
        },

        include: {
          program: true,
        },
      });

    /*
     * Cuando SOPORTE empieza a trabajar,
     * la instalación pasa a EN_PROGRESO.
     */

    if (
      user.role === "SOPORTE" &&
      (installation.status === "PENDIENTE" ||
        installation.status === "ASIGNADA")
    ) {
      await prisma.installation.update({
        where: {
          id: installation.id,
        },

        data: {
          status: "EN_PROGRESO",
          startedAt: installation.startedAt ?? now,
        },
      });
    }

    /*
     * Registro de auditoría.
     */

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        accion: "ACTUALIZAR",
        entidad: "InstallationProgram",
        entidadId: updated.id,

        descripcion:
          `Actualización del programa ${updated.program.nombre} ` +
          `en ${installation.codigo}`,

        datos: {
          installationId,
          programId: updated.programId,
          installed: finalInstalled,
          configured: finalConfigured,
          status,
        },
      },
    });

    return NextResponse.json({
      message: "Programa actualizado correctamente",
      installationProgram: updated,
    });
  } catch (error) {
    console.error(
      "Error actualizando programa de instalación:",
      error
    );

    return NextResponse.json(
      {
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}