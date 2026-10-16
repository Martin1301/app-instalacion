import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import { Role, UserStatus } from "../src/generated/prisma/enums";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Iniciando seed...");

  const password = await bcrypt.hash("Admin123*", 12);

  const admin = await prisma.user.upsert({
    where: {
      username: "admin",
    },
    update: {},
    create: {
      username: "admin",
      password,
      nombres: "Administrador",
      apellidos: "Sistema",
      email: "admin@instalaciones-ti.local",
      role: Role.ADMINISTRADOR,
      status: UserStatus.ACTIVO,
    },
  });

  console.log("Administrador creado:");
  console.log({
    id: admin.id,
    username: admin.username,
    role: admin.role,
  });
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });