import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET no está configurado en el archivo .env");
}

const secretKey = new TextEncoder().encode(secret);

export type AuthUser = {
  apellidos: string | null;
  nombres: string | null;
  id: number;
  username: string;
  role: "ADMINISTRADOR" | "JEFE" | "SOPORTE" | "INVITADO";
};

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    role: user.role,
    nombres: user.nombres,
    apellidos: user.apellidos,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey);
}

export async function verifyToken(
  token: string
): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);

    if (
      typeof payload.id !== "number" &&
      typeof payload.id !== "string"
    ) {
      return null;
    }

    if (typeof payload.username !== "string") {
      return null;
    }

    if (typeof payload.role !== "string") {
      return null;
    }

    return {
      id: Number(payload.id),
      username: payload.username,
      role: payload.role as AuthUser["role"],
      nombres:
        typeof payload.nombres === "string"
          ? payload.nombres
          : null,
      apellidos:
        typeof payload.apellidos === "string"
          ? payload.apellidos
          : null,
    };
  } catch {
    return null;
  }
}

export async function getUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}