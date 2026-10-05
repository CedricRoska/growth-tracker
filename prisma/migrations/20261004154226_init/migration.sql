-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('TIKTOK', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "Ownership" AS ENUM ('OWNED', 'CREATOR');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('IDLE', 'RUNNING', 'OK', 'ERROR');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "profileUrl" TEXT,
    "bio" TEXT,
    "ownership" "Ownership" NOT NULL DEFAULT 'OWNED',
    "creatorId" TEXT,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'IDLE',
    "syncError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "thumbnailUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSnapshot" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" INTEGER NOT NULL,
    "likes" INTEGER NOT NULL,
    "comments" INTEGER NOT NULL,
    "shares" INTEGER NOT NULL,
    "saves" INTEGER NOT NULL,

    CONSTRAINT "PostSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followers" INTEGER NOT NULL,
    "totalViews" INTEGER NOT NULL,
    "totalLikes" INTEGER NOT NULL,
    "totalPosts" INTEGER NOT NULL,

    CONSTRAINT "AccountSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "accountsSynced" INTEGER NOT NULL DEFAULT 0,
    "accountsFailed" INTEGER NOT NULL DEFAULT 0,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "error" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Creator_workspaceId_idx" ON "Creator"("workspaceId");

-- CreateIndex
CREATE INDEX "Account_workspaceId_idx" ON "Account"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_workspaceId_platform_handle_key" ON "Account"("workspaceId", "platform", "handle");

-- CreateIndex
CREATE INDEX "Post_accountId_publishedAt_idx" ON "Post"("accountId", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_publishedAt_idx" ON "Post"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Post_accountId_externalId_key" ON "Post"("accountId", "externalId");

-- CreateIndex
CREATE INDEX "PostSnapshot_postId_capturedAt_idx" ON "PostSnapshot"("postId", "capturedAt");

-- CreateIndex
CREATE INDEX "PostSnapshot_capturedAt_idx" ON "PostSnapshot"("capturedAt");

-- CreateIndex
CREATE INDEX "AccountSnapshot_accountId_capturedAt_idx" ON "AccountSnapshot"("accountId", "capturedAt");

-- CreateIndex
CREATE INDEX "AccountSnapshot_capturedAt_idx" ON "AccountSnapshot"("capturedAt");

-- CreateIndex
CREATE INDEX "SyncRun_workspaceId_startedAt_idx" ON "SyncRun"("workspaceId", "startedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creator" ADD CONSTRAINT "Creator_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSnapshot" ADD CONSTRAINT "PostSnapshot_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSnapshot" ADD CONSTRAINT "AccountSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
