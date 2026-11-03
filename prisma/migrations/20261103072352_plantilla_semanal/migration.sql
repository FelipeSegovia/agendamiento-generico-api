-- CreateTable
CREATE TABLE "WeeklyTemplateRange" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "WeeklyTemplateRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyTemplateRange_professionalId_idx" ON "WeeklyTemplateRange"("professionalId");

-- AddForeignKey
ALTER TABLE "WeeklyTemplateRange" ADD CONSTRAINT "WeeklyTemplateRange_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
