-- Module pacing: fixed cohort calendar + per-module SCORM progress

CREATE TYPE "LearnerModuleProgressStatus" AS ENUM (
  'LOCKED',
  'UNLOCKED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED'
);

ALTER TABLE "courses"
  ADD COLUMN "modulePacingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "modulePacingDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "pacingStartDate" TIMESTAMP(3);

ALTER TABLE "modules"
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "scormActivityId" TEXT;

CREATE TABLE "learner_module_progress" (
  "id" VARCHAR(25) NOT NULL,
  "userId" VARCHAR(25) NOT NULL,
  "courseId" VARCHAR(25) NOT NULL,
  "moduleId" VARCHAR(25) NOT NULL,
  "scormActivityId" TEXT,
  "status" "LearnerModuleProgressStatus" NOT NULL DEFAULT 'LOCKED',
  "unlockedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "scorePercent" DOUBLE PRECISION,
  "completionPercentage" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "learner_module_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "learner_module_progress_userId_moduleId_key"
  ON "learner_module_progress"("userId", "moduleId");

CREATE INDEX "learner_module_progress_userId_courseId_idx"
  ON "learner_module_progress"("userId", "courseId");

ALTER TABLE "learner_module_progress"
  ADD CONSTRAINT "learner_module_progress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learner_module_progress"
  ADD CONSTRAINT "learner_module_progress_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learner_module_progress"
  ADD CONSTRAINT "learner_module_progress_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
