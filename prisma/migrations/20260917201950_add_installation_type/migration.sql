-- CreateEnum
CREATE TYPE "InstallationType" AS ENUM ('INSTALACION', 'REINSTALACION', 'CORRECCION', 'ACTUALIZACION');

-- AlterTable
ALTER TABLE "Installation" ADD COLUMN     "type" "InstallationType" NOT NULL DEFAULT 'INSTALACION';
