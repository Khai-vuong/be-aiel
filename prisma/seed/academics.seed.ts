import { PrismaClient } from '@prisma/client';

export async function seedAcademics(prisma: PrismaClient): Promise<void> {
  const course1 = await prisma.course.create({
    data: {
      cid: 'course001',
      code: 'CS101',
      name: 'Introduction to Programming',
      description: 'Basic programming concepts using Python',
      credits: 3,
      lecturers: {
        connect: [{ lid: 'lecturer001' }, { lid: 'lecturer003' }],
      },
    },
  });

  const course2 = await prisma.course.create({
    data: {
      cid: 'course002',
      code: 'MT105',
      name: 'Calculus I',
      description: 'Differential and integral calculus',
      credits: 4,
      lecturers: {
        connect: [
          { lid: 'lecturer001' },
          { lid: 'lecturer002' },
          { lid: 'lecturer004' },
        ],
      },
    },
  });

  const enrollments = [
    { ceid: 'enrollment001', student_id: 'student001', course_id: course1.cid },
    { ceid: 'enrollment002', student_id: 'student001', course_id: course2.cid },
    { ceid: 'enrollment003', student_id: 'student002', course_id: course1.cid },
    { ceid: 'enrollment004', student_id: 'student003', course_id: course1.cid },
    { ceid: 'enrollment005', student_id: 'student004', course_id: course1.cid },
    { ceid: 'enrollment006', student_id: 'student005', course_id: course1.cid },
    { ceid: 'enrollment007', student_id: 'student006', course_id: course1.cid },
    { ceid: 'enrollment008', student_id: 'student007', course_id: course1.cid },
    { ceid: 'enrollment009', student_id: 'student008', course_id: course1.cid },
    { ceid: 'enrollment010', student_id: 'student009', course_id: course1.cid },
    { ceid: 'enrollment011', student_id: 'student010', course_id: course1.cid },
  ];

  for (const enrollment of enrollments) {
    await prisma.courseEnrollment.create({
      data: {
        ...enrollment,
        status: 'Pending',
      },
    });
  }

  const class1 = await prisma.class.create({
    data: {
      clid: 'class001',
      name: 'CS101 - L1',
      schedule_json: JSON.stringify({ day: 'Monday', start: '09:00', end: '11:00' }),
      location: 'Computer Science Building - Room 101',
      status: 'Active',
      course_id: course1.cid,
      lecturer_id: 'lecturer001',
      students: {
        connect: [{ sid: 'student001' }, { sid: 'student003' }, { sid: 'student005' }],
      },
    },
  });

  const class2 = await prisma.class.create({
    data: {
      clid: 'class002',
      name: 'CS101 - L2',
      schedule_json: JSON.stringify({ day: 'Wednesday', start: '14:00', end: '16:00' }),
      location: 'Computer Science Building - Room 102',
      status: 'Active',
      course_id: course1.cid,
      lecturer_id: 'lecturer003',
      students: {
        connect: [{ sid: 'student001' }, { sid: 'student002' }, { sid: 'student007' }],
      },
    },
  });

  const class3 = await prisma.class.create({
    data: {
      clid: 'class003',
      name: 'MT105 - L1',
      schedule_json: JSON.stringify({ day: 'Tuesday', start: '10:00', end: '12:00' }),
      location: 'Mathematics Building - Room 201',
      status: 'Active',
      course_id: course2.cid,
      lecturer_id: 'lecturer002',
      students: {
        connect: [
          { sid: 'student001' },
          { sid: 'student004' },
          { sid: 'student006' },
          { sid: 'student008' },
        ],
      },
    },
  });

  await prisma.class.create({
    data: {
      clid: 'class004',
      name: 'CS101 - L3',
      schedule_json: JSON.stringify({ day: 'Thursday', start: '13:00', end: '15:00' }),
      location: 'Computer Science Building - Room 103',
      status: 'Active',
      course_id: course1.cid,
      lecturer_id: 'lecturer005',
      students: {
        connect: [{ sid: 'student001' }, { sid: 'student009' }, { sid: 'student010' }],
      },
    },
  });

  const class5 = await prisma.class.create({
    data: {
      clid: 'class005',
      name: 'MT105 - L2',
      schedule_json: JSON.stringify({ day: 'Friday', start: '15:00', end: '17:00' }),
      location: 'Mathematics Building - Room 202',
      status: 'Active',
      course_id: course2.cid,
      lecturer_id: 'lecturer004',
      students: {
        connect: [{ sid: 'student001' }, { sid: 'student003' }, { sid: 'student005' }],
      },
    },
  });

  await prisma.file.create({
    data: {
      fid: 'file001',
      filename: 'CS101_Syllabus.pdf',
      url: '/files/cs101_syllabus.pdf',
      size: 1024.5,
      mime_type: 'application/pdf',
      file_type: 'document',
      is_public: true,
      class_id: class1.clid,
      uploader_id: 'user002',
    },
  });

  await prisma.file.create({
    data: {
      fid: 'file002',
      filename: 'Python_Basics_Lecture1.pptx',
      url: '/files/python_basics_lecture1.pptx',
      size: 2048.75,
      mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      file_type: 'document',
      is_public: false,
      class_id: class1.clid,
      uploader_id: 'user002',
    },
  });

  // Keep explicit references used in activity seed.
  void class2;
  void class3;
  void class5;
}
