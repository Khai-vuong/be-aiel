/*
  Warnings:

  - The primary key for the `Course` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `categoryId` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `instructorId` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `published` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Course` table. All the data in the column will be lost.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Enrollment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Lesson` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Profile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Submission` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code]` on the table `Course` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - The required column `cid` was added to the `Course` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `code` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lecturer_id` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hashed_password` to the `User` table without a default value. This is not possible if the table is not empty.
  - The required column `uid` was added to the `User` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updated_at` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Course" DROP CONSTRAINT "Course_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Course" DROP CONSTRAINT "Course_instructorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Enrollment" DROP CONSTRAINT "Enrollment_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Enrollment" DROP CONSTRAINT "Enrollment_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Lesson" DROP CONSTRAINT "Lesson_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Profile" DROP CONSTRAINT "Profile_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Submission" DROP CONSTRAINT "Submission_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Submission" DROP CONSTRAINT "Submission_userId_fkey";

-- DropIndex
DROP INDEX "public"."User_email_key";

-- AlterTable
ALTER TABLE "Course" DROP CONSTRAINT "Course_pkey",
DROP COLUMN "categoryId",
DROP COLUMN "createdAt",
DROP COLUMN "id",
DROP COLUMN "imageUrl",
DROP COLUMN "instructorId",
DROP COLUMN "price",
DROP COLUMN "published",
DROP COLUMN "title",
DROP COLUMN "updatedAt",
ADD COLUMN     "cid" TEXT NOT NULL,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "credits" INTEGER DEFAULT 3,
ADD COLUMN     "lecturer_id" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ADD CONSTRAINT "Course_pkey" PRIMARY KEY ("cid");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "email",
DROP COLUMN "id",
DROP COLUMN "name",
DROP COLUMN "password",
DROP COLUMN "role",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hashed_password" TEXT NOT NULL,
ADD COLUMN     "status" TEXT DEFAULT 'active',
ADD COLUMN     "uid" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("uid");

-- DropTable
DROP TABLE "public"."Category";

-- DropTable
DROP TABLE "public"."Enrollment";

-- DropTable
DROP TABLE "public"."Lesson";

-- DropTable
DROP TABLE "public"."Profile";

-- DropTable
DROP TABLE "public"."Submission";

-- DropEnum
DROP TYPE "public"."EnrollmentStatus";

-- DropEnum
DROP TYPE "public"."UserRole";

-- CreateTable
CREATE TABLE "Student" (
    "sid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "major" TEXT NOT NULL,
    "personal_info_json" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "Lecturer" (
    "lid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "personal_info_json" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lecturer_pkey" PRIMARY KEY ("lid")
);

-- CreateTable
CREATE TABLE "Admin" (
    "aid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "personal_info" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("aid")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "ceid" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("ceid")
);

-- CreateTable
CREATE TABLE "Class" (
    "clid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schedule_json" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "course_id" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("clid")
);

-- CreateTable
CREATE TABLE "File" (
    "fid" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" DOUBLE PRECISION,
    "mime_type" TEXT NOT NULL,
    "file_type" TEXT NOT NULL DEFAULT 'document',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "class_id" TEXT NOT NULL,
    "uploader_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("fid")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "qid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "settings_json" TEXT,
    "available_from" TIMESTAMP(3),
    "available_until" TIMESTAMP(3),
    "class_id" TEXT,
    "creator_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("qid")
);

-- CreateTable
CREATE TABLE "Question" (
    "ques_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "options_json" TEXT,
    "answer_key_json" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "quiz_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("ques_id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "atid" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "max_score" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "quiz_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("atid")
);

-- CreateTable
CREATE TABLE "Answer" (
    "ansid" TEXT NOT NULL,
    "answer_json" TEXT NOT NULL,
    "is_correct" BOOLEAN,
    "points_awarded" DOUBLE PRECISION,
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("ansid")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_user_id_key" ON "Student"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Lecturer_user_id_key" ON "Lecturer"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_user_id_key" ON "Admin"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "CourseEnrollment_student_id_course_id_key" ON "CourseEnrollment"("student_id", "course_id");

-- CreateIndex
CREATE INDEX "File_class_id_idx" ON "File"("class_id");

-- CreateIndex
CREATE INDEX "File_file_type_idx" ON "File"("file_type");

-- CreateIndex
CREATE INDEX "File_mime_type_idx" ON "File"("mime_type");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_quiz_id_student_id_attempt_number_key" ON "Attempt"("quiz_id", "student_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_created_at_idx" ON "User"("created_at");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lecturer" ADD CONSTRAINT "Lecturer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "Lecturer"("lid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("sid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("cid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("cid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "Lecturer"("lid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("clid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "User"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("clid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Lecturer"("lid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz"("qid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz"("qid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("sid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "Attempt"("atid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("ques_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("sid") ON DELETE RESTRICT ON UPDATE CASCADE;
