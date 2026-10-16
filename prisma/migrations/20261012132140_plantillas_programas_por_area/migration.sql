-- CreateTable
CREATE TABLE "AreaProgramTemplate" (
    "id" SERIAL NOT NULL,
    "areaId" INTEGER NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaProgramTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaProgramTemplateProgram" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "programId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AreaProgramTemplateProgram_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AreaProgramTemplate_areaId_key" ON "AreaProgramTemplate"("areaId");

-- CreateIndex
CREATE INDEX "AreaProgramTemplate_activo_idx" ON "AreaProgramTemplate"("activo");

-- CreateIndex
CREATE INDEX "AreaProgramTemplateProgram_programId_idx" ON "AreaProgramTemplateProgram"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaProgramTemplateProgram_templateId_programId_key" ON "AreaProgramTemplateProgram"("templateId", "programId");

-- AddForeignKey
ALTER TABLE "AreaProgramTemplate" ADD CONSTRAINT "AreaProgramTemplate_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaProgramTemplateProgram" ADD CONSTRAINT "AreaProgramTemplateProgram_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AreaProgramTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaProgramTemplateProgram" ADD CONSTRAINT "AreaProgramTemplateProgram_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
