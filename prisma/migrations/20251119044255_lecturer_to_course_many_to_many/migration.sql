/*
  Warnings:

  - You are about to drop the column `lecturer_id` on the `Course` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Course" DROP CONSTRAINT "Course_lecturer_id_fkey";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "lecturer_id";

-- CreateTable
CREATE TABLE "_LecturerCourses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LecturerCourses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_LecturerCourses_B_index" ON "_LecturerCourses"("B");

-- AddForeignKey
ALTER TABLE "_LecturerCourses" ADD CONSTRAINT "_LecturerCourses_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("cid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LecturerCourses" ADD CONSTRAINT "_LecturerCourses_B_fkey" FOREIGN KEY ("B") REFERENCES "Lecturer"("lid") ON DELETE CASCADE ON UPDATE CASCADE;
