-- CreateTable
CREATE TABLE "economy_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "courseCompletion" INTEGER NOT NULL DEFAULT 50,
    "moduleCompletion" INTEGER NOT NULL DEFAULT 10,
    "perfectQuiz" INTEGER NOT NULL DEFAULT 25,
    "dailyStreak" INTEGER NOT NULL DEFAULT 5,
    "streakDaysRequired" INTEGER NOT NULL DEFAULT 7,
    "enableLeaderboard" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" VARCHAR(25),

    CONSTRAINT "economy_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_awards" (
    "id" VARCHAR(25) NOT NULL,
    "userId" VARCHAR(25) NOT NULL,
    "awardType" VARCHAR(50) NOT NULL,
    "referenceId" VARCHAR(100) NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coin_awards_userId_createdAt_idx" ON "coin_awards"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "coin_awards_userId_awardType_referenceId_key" ON "coin_awards"("userId", "awardType", "referenceId");

-- AddForeignKey
ALTER TABLE "coin_awards" ADD CONSTRAINT "coin_awards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default economy rules
INSERT INTO "economy_config" ("id", "courseCompletion", "moduleCompletion", "perfectQuiz", "dailyStreak", "streakDaysRequired", "enableLeaderboard", "updatedAt")
VALUES ('default', 50, 10, 25, 5, 7, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
