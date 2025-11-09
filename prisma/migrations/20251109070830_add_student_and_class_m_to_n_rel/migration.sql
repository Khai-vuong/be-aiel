-- AlterTable
ALTER TABLE "Class" ALTER COLUMN "status" SET DEFAULT 'Active';

-- AlterTable
ALTER TABLE "CourseEnrollment" ALTER COLUMN "status" SET DEFAULT 'Pending';

-- CreateTable
CREATE TABLE "_StudentInClass" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StudentInClass_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_StudentInClass_B_index" ON "_StudentInClass"("B");

-- AddForeignKey
ALTER TABLE "_StudentInClass" ADD CONSTRAINT "_StudentInClass_A_fkey" FOREIGN KEY ("A") REFERENCES "Class"("clid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentInClass" ADD CONSTRAINT "_StudentInClass_B_fkey" FOREIGN KEY ("B") REFERENCES "Student"("sid") ON DELETE CASCADE ON UPDATE CASCADE;
