import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: Params
) {
  try {
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "No autenticado" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ADMINISTRADOR") {
      return NextResponse.json(
        {
          message:
            "No tienes permisos para modificar usuarios",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = Number(id);

    if (!Number.isInteger(userId)) {
      return NextResponse.json(
        { message: "ID de usuario inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();

    /*
     * ==========================================
     * ACTIVAR / DESACTIVAR
     * ==========================================
     */

    if (body.status !== undefined) {
      const status = String(body.status);

      if (
        status !== "ACTIVO" &&
        status !== "INACTIVO"
      ) {
        return NextResponse.json(
          { message: "Estado inválido" },
          { status: 400 }
        );
      }

      if (
        userId === currentUser.id &&
        status === "INACTIVO"
      ) {
        return NextResponse.json(
          {
            message:
              "No puedes desactivar tu propio usuario",
          },
          { status: 400 }
        );
      }

      const user = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          status,
        },
        select: {
          id: true,
          username: true,
          status: true,
        },
      });

      return NextResponse.json(user);
    }

    /*
     * ==========================================
     * EDITAR USUARIO
     * ==========================================
     */

    const username = String(
      body.username ?? ""
    ).trim();

    const nombres = String(
      body.nombres ?? ""
    ).trim();

    const apellidos = String(
      body.apellidos ?? ""
    ).trim();

    const email =
      String(body.email ?? "").trim() || null;

    const role = String(body.role ?? "");

    const areaId =
      body.areaId !== null &&
      body.areaId !== undefined &&
      body.areaId !== ""
        ? Number(body.areaId)
        : null;

    const password = String(
      body.password ?? ""
    );

    if (
      !username ||
      !nombres ||
      !apellidos ||
      !role
    ) {
      return NextResponse.json(
        {
          message:
            "Usuario, nombres, apellidos y rol son obligatorios",
        },
        { status: 400 }
      );
    }

    const validRoles = [
      "ADMINISTRADOR",
      "JEFE",
      "SOPORTE",
      "INVITADO",
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: "Rol inválido" },
        { status: 400 }
      );
    }

    /*
     * Validar área
     */

    if (areaId !== null) {
      if (!Number.isInteger(areaId)) {
        return NextResponse.json(
          { message: "Área inválida" },
          { status: 400 }
        );
      }

      const area = await prisma.area.findUnique({
        where: {
          id: areaId,
        },
      });

      if (!area) {
        return NextResponse.json(
          {
            message:
              "El área seleccionada no existe",
          },
          { status: 400 }
        );
      }
    }

    /*
     * Validar usuario/correo duplicado
     */

    const existingUser =
      await prisma.user.findFirst({
        where: {
          OR: [
            {
              username,
            },
            ...(email
              ? [
                  {
                    email,
                  },
                ]
              : []),
          ],
          NOT: {
            id: userId,
          },
        },
        select: {
          id: true,
          username: true,
          email: true,
        },
      });

    if (existingUser) {
      if (
        existingUser.username === username
      ) {
        return NextResponse.json(
          {
            message:
              "El nombre de usuario ya existe",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          message:
            "El correo electrónico ya está registrado",
        },
        { status: 409 }
      );
    }

    /*
     * Datos a actualizar
     */

    const data: {
      username: string;
      nombres: string;
      apellidos: string;
      email: string | null;
      role:
        | "ADMINISTRADOR"
        | "JEFE"
        | "SOPORTE"
        | "INVITADO";
      areaId: number | null;
      password?: string;
    } = {
      username,
      nombres,
      apellidos,
      email,
      role: role as
        | "ADMINISTRADOR"
        | "JEFE"
        | "SOPORTE"
        | "INVITADO",
      areaId,
    };

    /*
     * Cambiar contraseña solamente
     * si el administrador escribió una nueva
     */

    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          {
            message:
              "La contraseña debe tener al menos 8 caracteres",
          },
          { status: 400 }
        );
      }

      data.password =
        await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data,
      select: {
        id: true,
        username: true,
        nombres: true,
        apellidos: true,
        email: true,
        role: true,
        status: true,
        area: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error(
      "Error actualizando usuario:",
      error
    );

    return NextResponse.json(
      {
        message:
          "No se pudo actualizar el usuario",
      },
      { status: 500 }
    );
  }
}

/*
 * ==========================================
 * ELIMINAR USUARIO
 * ==========================================
 */

export async function DELETE(
  _request: Request,
  { params }: Params
) {
  try {
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "No autenticado" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ADMINISTRADOR") {
      return NextResponse.json(
        {
          message:
            "No tienes permisos para eliminar usuarios",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = Number(id);

    if (!Number.isInteger(userId)) {
      return NextResponse.json(
        { message: "ID de usuario inválido" },
        { status: 400 }
      );
    }

    /*
     * No permitir eliminarse a sí mismo
     */

    if (userId === currentUser.id) {
      return NextResponse.json(
        {
          message:
            "No puedes eliminar tu propio usuario",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        equipment: {
          select: {
            id: true,
          },
        },
        createdInstallations: {
          select: {
            id: true,
          },
          take: 1,
        },
        assignedInstallations: {
          select: {
            id: true,
          },
          take: 1,
        },
        comments: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          message: "Usuario no encontrado",
        },
        { status: 404 }
      );
    }

    /*
     * No eliminar usuarios que ya
     * tengan historial o equipo asociado.
     */

    if (user.equipment) {
      return NextResponse.json(
        {
          message:
            "Este usuario tiene un equipo asignado. Desactívalo en lugar de eliminarlo.",
        },
        { status: 409 }
      );
    }

    if (user.createdInstallations.length > 0) {
      return NextResponse.json(
        {
          message:
            "Este usuario tiene instalaciones creadas y posee historial. Desactívalo en lugar de eliminarlo.",
        },
        { status: 409 }
      );
    }

    if (user.assignedInstallations.length > 0) {
      return NextResponse.json(
        {
          message:
            "Este usuario tiene instalaciones asignadas. Desactívalo en lugar de eliminarlo.",
        },
        { status: 409 }
      );
    }

    if (user.comments.length > 0) {
      return NextResponse.json(
        {
          message:
            "Este usuario tiene comentarios registrados. Desactívalo en lugar de eliminarlo.",
        },
        { status: 409 }
      );
    }

    /*
     * Si no tiene historial, podemos eliminarlo.
     *
     * UserProgram tiene onDelete: Cascade.
     * Notification tiene onDelete: Cascade.
     * AuditLog tiene onDelete: SetNull.
     */

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return NextResponse.json({
      message:
        "Usuario eliminado correctamente",
    });
  } catch (error) {
    console.error(
      "Error eliminando usuario:",
      error
    );

    return NextResponse.json(
      {
        message:
          "No se pudo eliminar el usuario",
      },
      { status: 500 }
    );
  }
}