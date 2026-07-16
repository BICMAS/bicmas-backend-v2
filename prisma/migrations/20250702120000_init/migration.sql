-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'HR_MANAGER', 'LEARNER');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('HR', 'ENGINEERING', 'SALES', 'MARKETING', 'FINANCE', 'OPERATIONS', 'IT', 'CUSTOMER_SUPPORT', 'LEGAL', 'ADMINISTRATION');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'SSO');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('PWA', 'MOBILE', 'DESKTOP');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('MEMBER', 'OWNER');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'INTERNAL');

-- CreateEnum
CREATE TYPE "ScormVersion" AS ENUM ('V1_2', 'V2004');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('INCOMPLETE', 'COMPLETED', 'PASSED', 'FAILED', 'NOT_STARTED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "LearningPathStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(25) NOT NULL,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "userRole" "UserRole" NOT NULL DEFAULT 'LEARNER',
    "department" "Department",
    "phoneNumber" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" VARCHAR(25),
    "groupId" VARCHAR(25),
    "streak" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" VARCHAR(25) NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB,
    "createdBy" VARCHAR(25) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" VARCHAR(25) NOT NULL,
    "userId" VARCHAR(25) NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_push_subscriptions" (
    "id" VARCHAR(25) NOT NULL,
    "userId" VARCHAR(25) NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" VARCHAR(25) NOT NULL,
    "orgId" VARCHAR(25),
    "name" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" VARCHAR(25) NOT NULL,
    "groupId" VARCHAR(25) NOT NULL,
    "userId" VARCHAR(25) NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" VARCHAR(25) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tags" JSONB,
    "visibility" "Visibility",
    "version" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "durationEstimate" INTEGER,
    "scormPackageId" VARCHAR(25),
    "createdBy" VARCHAR(25) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scormCloudCourseId" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" VARCHAR(25) NOT NULL,
    "name" TEXT NOT NULL,
    "courseId" VARCHAR(25) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" VARCHAR(25) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scormPackageId" VARCHAR(25),
    "moduleId" VARCHAR(25) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scormCloudCourseId" TEXT,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scorm_packages" (
    "id" VARCHAR(25) NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "manifestJson" JSONB NOT NULL,
    "scormVersion" "ScormVersion" NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "checksum" TEXT NOT NULL,
    "scormCloudId" TEXT,
    "launchFile" TEXT,
    "uploadedBy" VARCHAR(25) NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blobs" TEXT[],
    "fileCount" INTEGER NOT NULL,
    "packageSize" INTEGER NOT NULL,

    CONSTRAINT "scorm_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" VARCHAR(25) NOT NULL,
    "courseId" VARCHAR(25) NOT NULL,
    "assignerId" VARCHAR(25) NOT NULL,
    "assigneeUserId" VARCHAR(25),
    "assigneeGroupId" VARCHAR(25),
    "dueDate" TIMESTAMP(3),
    "recurrenceRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupId" VARCHAR(25),

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" VARCHAR(25) NOT NULL,
    "userId" VARCHAR(25) NOT NULL,
    "courseId" VARCHAR(25),
    "status" "AttemptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completionPercentage" DOUBLE PRECISION DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignmentId" VARCHAR(25),
    "learningHours" DOUBLE PRECISION,
    "score" DOUBLE PRECISION,
    "scormPackageId" VARCHAR(25),
    "scormCloudRegistrationId" TEXT,
    "scormCloudLastSyncAt" TIMESTAMP(3),
    "scormCloudCompletion" DOUBLE PRECISION,
    "scormCloudScoreScaled" DOUBLE PRECISION,
    "scormCloudDuration" TEXT,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scorm_attempts" (
    "id" VARCHAR(25) NOT NULL,
    "userId" VARCHAR(25) NOT NULL,
    "scormPackageId" VARCHAR(25) NOT NULL,
    "attemptId" VARCHAR(25),
    "scormCloudRegistrationId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "completionPercentage" DOUBLE PRECISION DEFAULT 0,
    "score" DOUBLE PRECISION,
    "learningHours" DOUBLE PRECISION,
    "scormCloudLastSyncAt" TIMESTAMP(3),
    "scormCloudCompletion" DOUBLE PRECISION,
    "scormCloudScoreScaled" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scorm_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" VARCHAR(25) NOT NULL,
    "attemptId" VARCHAR(25) NOT NULL,
    "interactionIndex" INTEGER NOT NULL,
    "interactionType" TEXT NOT NULL,
    "correctResponse" JSONB,
    "learnerResponse" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspend_data" (
    "id" VARCHAR(25) NOT NULL,
    "attemptId" VARCHAR(25) NOT NULL,
    "suspendBlob" JSONB NOT NULL,

    CONSTRAINT "suspend_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" VARCHAR(25) NOT NULL,
    "userId" VARCHAR(25) NOT NULL,
    "courseId" VARCHAR(25) NOT NULL,
    "templateId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfPath" TEXT NOT NULL,
    "verificationHash" TEXT NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" VARCHAR(25) NOT NULL,
    "filename" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "description" TEXT,
    "createdBy" VARCHAR(25) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" VARCHAR(25) NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" VARCHAR(25) NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" VARCHAR(25) NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "questions" JSONB[],
    "passingScore" DOUBLE PRECISION DEFAULT 70,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "attemptsCount" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" VARCHAR(25) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT,
    "enrolmentRule" TEXT,
    "curriculumSequence" JSONB NOT NULL,
    "status" "LearningPathStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdBy" VARCHAR(25) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_enrolments" (
    "id" VARCHAR(25) NOT NULL,
    "learningPathId" VARCHAR(25) NOT NULL,
    "userId" VARCHAR(25) NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "progress" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "learning_path_enrolments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldTask" (
    "id" TEXT NOT NULL,
    "moduleTitle" TEXT,
    "description" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "devices_userId_deviceToken_key" ON "devices"("userId", "deviceToken");

-- CreateIndex
CREATE UNIQUE INDEX "web_push_subscriptions_endpoint_key" ON "web_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "web_push_subscriptions_userId_idx" ON "web_push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_groupId_userId_key" ON "group_members"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "courses_scormCloudCourseId_key" ON "courses"("scormCloudCourseId");

-- CreateIndex
CREATE INDEX "modules_courseId_idx" ON "modules"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_scormCloudCourseId_key" ON "lessons"("scormCloudCourseId");

-- CreateIndex
CREATE INDEX "lessons_moduleId_idx" ON "lessons"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "scorm_packages_scormCloudId_key" ON "scorm_packages"("scormCloudId");

-- CreateIndex
CREATE INDEX "assignments_courseId_idx" ON "assignments"("courseId");

-- CreateIndex
CREATE INDEX "assignments_assignerId_idx" ON "assignments"("assignerId");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_courseId_assigneeUserId_key" ON "assignments"("courseId", "assigneeUserId");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_courseId_assigneeGroupId_key" ON "assignments"("courseId", "assigneeGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_scormCloudRegistrationId_key" ON "attempts"("scormCloudRegistrationId");

-- CreateIndex
CREATE INDEX "attempts_userId_idx" ON "attempts"("userId");

-- CreateIndex
CREATE INDEX "attempts_courseId_idx" ON "attempts"("courseId");

-- CreateIndex
CREATE INDEX "attempts_scormPackageId_idx" ON "attempts"("scormPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_userId_courseId_key" ON "attempts"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_userId_scormPackageId_key" ON "attempts"("userId", "scormPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "scorm_attempts_scormCloudRegistrationId_key" ON "scorm_attempts"("scormCloudRegistrationId");

-- CreateIndex
CREATE INDEX "scorm_attempts_userId_idx" ON "scorm_attempts"("userId");

-- CreateIndex
CREATE INDEX "scorm_attempts_scormPackageId_idx" ON "scorm_attempts"("scormPackageId");

-- CreateIndex
CREATE INDEX "scorm_attempts_attemptId_idx" ON "scorm_attempts"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "scorm_attempts_userId_scormPackageId_key" ON "scorm_attempts"("userId", "scormPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "interactions_attemptId_interactionIndex_key" ON "interactions"("attemptId", "interactionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "suspend_data_attemptId_key" ON "suspend_data"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_userId_courseId_key" ON "certificates"("userId", "courseId");

-- CreateIndex
CREATE INDEX "audit_logs_eventType_createdAt_idx" ON "audit_logs"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_enrolments_learningPathId_userId_key" ON "learning_path_enrolments"("learningPathId", "userId");

-- CreateIndex
CREATE INDEX "FieldTask_createdBy_idx" ON "FieldTask"("createdBy");

-- CreateIndex
CREATE INDEX "FieldTask_createdAt_idx" ON "FieldTask"("createdAt");

-- CreateIndex
CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt");

-- CreateIndex
CREATE INDEX "Announcement_createdBy_idx" ON "Announcement"("createdBy");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_push_subscriptions" ADD CONSTRAINT "web_push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_scormPackageId_fkey" FOREIGN KEY ("scormPackageId") REFERENCES "scorm_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_scormPackageId_fkey" FOREIGN KEY ("scormPackageId") REFERENCES "scorm_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorm_packages" ADD CONSTRAINT "scorm_packages_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignerId_fkey" FOREIGN KEY ("assignerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_scormPackageId_fkey" FOREIGN KEY ("scormPackageId") REFERENCES "scorm_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorm_attempts" ADD CONSTRAINT "scorm_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorm_attempts" ADD CONSTRAINT "scorm_attempts_scormPackageId_fkey" FOREIGN KEY ("scormPackageId") REFERENCES "scorm_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorm_attempts" ADD CONSTRAINT "scorm_attempts_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspend_data" ADD CONSTRAINT "suspend_data_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_enrolments" ADD CONSTRAINT "learning_path_enrolments_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_enrolments" ADD CONSTRAINT "learning_path_enrolments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldTask" ADD CONSTRAINT "FieldTask_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

