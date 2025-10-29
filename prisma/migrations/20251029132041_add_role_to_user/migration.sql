-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'Student',
ALTER COLUMN "status" SET DEFAULT 'Active';
