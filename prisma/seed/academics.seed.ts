import { PrismaClient } from '@prisma/client';
import { createIfMissing } from './utils';

export async function seedAcademics(prisma: PrismaClient): Promise<void> {
  const course1Id = 'course001';
  const course2Id = 'course002';

  await createIfMissing(
    prisma.course.findUnique({ where: { cid: course1Id }, select: { cid: true } }),
    () =>
      prisma.course.create({
        data: {
          cid: course1Id,
          code: 'CS101',
          name: 'Introduction to Programming',
          description: 'Basic programming concepts using Python',
          credits: 3,
          lecturers: {
            connect: [{ lid: 'lecturer001' }, { lid: 'lecturer003' }],
          },
        },
      }),
    `Course ${course1Id}`,
  );

  await createIfMissing(
    prisma.course.findUnique({ where: { cid: course2Id }, select: { cid: true } }),
    () =>
      prisma.course.create({
        data: {
          cid: course2Id,
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
      }),
    `Course ${course2Id}`,
  );

  const enrollments = [
    {
      ceid: 'enrollment001',
      student_id: 'student001',
      course_id: course1Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-01T08:15:00Z'),
    },
    {
      ceid: 'enrollment002',
      student_id: 'student002',
      course_id: course1Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-01T13:40:00Z'),
    },
    {
      ceid: 'enrollment003',
      student_id: 'student003',
      course_id: course1Id,
      status: 'Unregistered',
      enrolled_at: new Date('2025-01-02T09:05:00Z'),
    },
    {
      ceid: 'enrollment004',
      student_id: 'student004',
      course_id: course1Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-02T16:20:00Z'),
    },
    {
      ceid: 'enrollment005',
      student_id: 'student005',
      course_id: course1Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-03T07:55:00Z'),
    },
    {
      ceid: 'enrollment006',
      student_id: 'student006',
      course_id: course1Id,
      status: 'Unregistered',
      enrolled_at: new Date('2025-01-03T14:10:00Z'),
    },
    {
      ceid: 'enrollment007',
      student_id: 'student007',
      course_id: course1Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-04T10:30:00Z'),
    },
    {
      ceid: 'enrollment008',
      student_id: 'student008',
      course_id: course1Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-04T18:05:00Z'),
    },
    {
      ceid: 'enrollment009',
      student_id: 'student009',
      course_id: course1Id,
      status: 'Unregistered',
      enrolled_at: new Date('2025-01-05T11:45:00Z'),
    },
    {
      ceid: 'enrollment010',
      student_id: 'student010',
      course_id: course1Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-05T15:25:00Z'),
    },
    {
      ceid: 'enrollment011',
      student_id: 'student001',
      course_id: course2Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-06T08:35:00Z'),
    },
    {
      ceid: 'enrollment012',
      student_id: 'student002',
      course_id: course2Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-06T12:50:00Z'),
    },
    {
      ceid: 'enrollment013',
      student_id: 'student003',
      course_id: course2Id,
      status: 'Unregistered',
      enrolled_at: new Date('2025-01-06T17:15:00Z'),
    },
    {
      ceid: 'enrollment014',
      student_id: 'student004',
      course_id: course2Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-07T09:10:00Z'),
    },
    {
      ceid: 'enrollment015',
      student_id: 'student005',
      course_id: course2Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-07T14:55:00Z'),
    },
    {
      ceid: 'enrollment016',
      student_id: 'student006',
      course_id: course2Id,
      status: 'Unregistered',
      enrolled_at: new Date('2025-01-08T10:05:00Z'),
    },
    {
      ceid: 'enrollment017',
      student_id: 'student007',
      course_id: course2Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-08T16:40:00Z'),
    },
    {
      ceid: 'enrollment018',
      student_id: 'student008',
      course_id: course2Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-09T07:20:00Z'),
    },
    {
      ceid: 'enrollment019',
      student_id: 'student009',
      course_id: course2Id,
      status: 'Pending',
      enrolled_at: new Date('2025-01-09T13:05:00Z'),
    },
    {
      ceid: 'enrollment020',
      student_id: 'student010',
      course_id: course2Id,
      status: 'Unregistered',
      enrolled_at: new Date('2025-01-10T11:30:00Z'),
    },
  ];

  for (const enrollment of enrollments) {
    await createIfMissing(
      prisma.courseEnrollment.findUnique({
        where: { ceid: enrollment.ceid },
        select: { ceid: true },
      }),
      () =>
        prisma.courseEnrollment.create({
          data: {
            ...enrollment,
          },
        }),
      `CourseEnrollment ${enrollment.ceid}`,
    );
  }

  const class1Id = 'class001';
  const class2Id = 'class002';
  const class3Id = 'class003';
  const class4Id = 'class004';
  const class5Id = 'class005';
  const class001StudentIds = Array.from({ length: 20 }, (_, index) =>
    `student${String(index + 1).padStart(3, '0')}`,
  );

  await createIfMissing(
    prisma.class.findUnique({ where: { clid: class1Id }, select: { clid: true } }),
    () =>
      prisma.class.create({
        data: {
          clid: class1Id,
          name: 'CS101 - L1',
          schedule_json: JSON.stringify({ day: 'Monday', start: '09:00', end: '11:00' }),
          location: 'Computer Science Building - Room 101',
          status: 'Active',
          course_id: course1Id,
          lecturer_id: 'lecturer001',
          students: {
            connect: class001StudentIds.map((sid) => ({ sid })),
          },
        },
      }),
    `Class ${class1Id}`,
  );

  await prisma.class.update({
    where: { clid: class1Id },
    data: {
      students: {
        set: class001StudentIds.map((sid) => ({ sid })),
      },
    },
  });

  await createIfMissing(
    prisma.class.findUnique({ where: { clid: class2Id }, select: { clid: true } }),
    () =>
      prisma.class.create({
        data: {
          clid: class2Id,
          name: 'CS101 - L2',
          schedule_json: JSON.stringify({ day: 'Wednesday', start: '14:00', end: '16:00' }),
          location: 'Computer Science Building - Room 102',
          status: 'Active',
          course_id: course1Id,
          lecturer_id: 'lecturer003',
          students: {
            connect: [{ sid: 'student001' }, { sid: 'student002' }, { sid: 'student007' }],
          },
        },
      }),
    `Class ${class2Id}`,
  );

  await createIfMissing(
    prisma.class.findUnique({ where: { clid: class3Id }, select: { clid: true } }),
    () =>
      prisma.class.create({
        data: {
          clid: class3Id,
          name: 'MT105 - L1',
          schedule_json: JSON.stringify({ day: 'Tuesday', start: '10:00', end: '12:00' }),
          location: 'Mathematics Building - Room 201',
          status: 'Active',
          course_id: course2Id,
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
      }),
    `Class ${class3Id}`,
  );

  await createIfMissing(
    prisma.class.findUnique({ where: { clid: class4Id }, select: { clid: true } }),
    () =>
      prisma.class.create({
        data: {
          clid: class4Id,
          name: 'CS101 - L3',
          schedule_json: JSON.stringify({ day: 'Thursday', start: '13:00', end: '15:00' }),
          location: 'Computer Science Building - Room 103',
          status: 'Active',
          course_id: course1Id,
          lecturer_id: 'lecturer005',
          students: {
            connect: [{ sid: 'student001' }, { sid: 'student009' }, { sid: 'student010' }],
          },
        },
      }),
    `Class ${class4Id}`,
  );

  await createIfMissing(
    prisma.class.findUnique({ where: { clid: class5Id }, select: { clid: true } }),
    () =>
      prisma.class.create({
        data: {
          clid: class5Id,
          name: 'MT105 - L2',
          schedule_json: JSON.stringify({ day: 'Friday', start: '15:00', end: '17:00' }),
          location: 'Mathematics Building - Room 202',
          status: 'Active',
          course_id: course2Id,
          lecturer_id: 'lecturer004',
          students: {
            connect: [{ sid: 'student001' }, { sid: 'student003' }, { sid: 'student005' }],
          },
        },
      }),
    `Class ${class5Id}`,
  );

  await createIfMissing(
    prisma.file.findUnique({ where: { fid: 'file001' }, select: { fid: true } }),
    () =>
      prisma.file.create({
        data: {
          fid: 'file001',
          filename: 'CS101_Syllabus.pdf',
          url: '/files/cs101_syllabus.pdf',
          size: 1024.5,
          mime_type: 'application/pdf',
          file_type: 'document',
          is_public: true,
          class_id: class1Id,
          uploader_id: 'user002',
        },
      }),
    'File file001',
  );

  await createIfMissing(
    prisma.file.findUnique({ where: { fid: 'file002' }, select: { fid: true } }),
    () =>
      prisma.file.create({
        data: {
          fid: 'file002',
          filename: 'Python_Basics_Lecture1.pptx',
          url: '/files/python_basics_lecture1.pptx',
          size: 2048.75,
          mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          file_type: 'document',
          is_public: false,
          class_id: class1Id,
          uploader_id: 'user002',
        },
      }),
    'File file002',
  );

  // Keep explicit references used in activity seed.
  void class2Id;
  void class3Id;
  void class5Id;
}
