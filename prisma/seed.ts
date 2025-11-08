import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      uid: 'user001',
      username: 'admin',
      hashed_password: 'admin123', // In production, this should be properly hashed
      status: 'Active',
      role: 'Admin',
      Admin: {
        create: {
          aid: 'admin001',
          name: 'System Administrator',
          personal_info: JSON.stringify({
            address: 'Admin Office',
            phone: '+1234567890',
            dob: '1980-01-01',
          }),
        },
      },
    },
  });

  // Create Lecturer Users
  const lecturer1User = await prisma.user.create({
    data: {
      uid: 'user002',
      username: 'lecturer1',
      hashed_password: 'lecturer123',
      status: 'Active',
      role: 'Lecturer',
      Lecturer: {
        create: {
          lid: 'lecturer001',
          name: 'Dr. John Smith',
          personal_info_json: JSON.stringify({
            address: '123 University Ave',
            phone: '+1234567891',
            dob: '1975-05-15',
            department: 'Computer Science',
          }),
        },
      },
    },
    include: {
      Lecturer: true,
    },
  });

  const lecturer2User = await prisma.user.create({
    data: {
      uid: 'user003',
      username: 'lecturer2',
      hashed_password: 'lecturer123',
      status: 'Active',
      role: 'Lecturer',
      Lecturer: {
        create: {
          lid: 'lecturer002',
          name: 'Dr. Jane Doe',
          personal_info_json: JSON.stringify({
            address: '456 Campus Rd',
            phone: '+1234567892',
            dob: '1978-08-22',
            department: 'Mathematics',
          }),
        },
      },
    },
    include: {
      Lecturer: true,
    },
  });

  // Create Student Users
  const student1User = await prisma.user.create({
    data: {
      uid: 'user004',
      username: 'student1',
      hashed_password: 'student123',
      status: 'Active',
      role: 'Student',
      Student: {
        create: {
          sid: 'student001',
          name: 'Alice Johnson',
          major: 'Computer Science',
          personal_info_json: JSON.stringify({
            address: '789 Student St',
            phone: '+1234567893',
            dob: '2000-03-10',
            year: 'Junior',
          }),
        },
      },
    },
    include: {
      Student: true,
    },
  });

  const student2User = await prisma.user.create({
    data: {
      uid: 'user005',
      username: 'student2',
      hashed_password: 'student123',
      status: 'Active',
      role: 'Student',
      Student: {
        create: {
          sid: 'student002',
          name: 'Bob Wilson',
          major: 'Mathematics',
          personal_info_json: JSON.stringify({
            address: '321 Dorm Ave',
            phone: '+1234567894',
            dob: '1999-11-25',
            year: 'Senior',
          }),
        },
      },
    },
    include: {
      Student: true,
    },
  });

  // Create Courses
  const course1 = await prisma.course.create({
    data: {
      cid: 'course001',
      code: 'CS101',
      name: 'Introduction to Programming',
      description: 'Basic programming concepts using Python',
      credits: 3,
      lecturer_id: lecturer1User.Lecturer!.lid,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      cid: 'course002',
      code: 'MATH201',
      name: 'Calculus I',
      description: 'Differential and integral calculus',
      credits: 4,
      lecturer_id: lecturer2User.Lecturer!.lid,
    },
  });

  // Create Course Enrollments
  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment001',
      student_id: student1User.Student!.sid,
      course_id: course1.cid,
      status: 'Active',
    },
  });

  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment002',
      student_id: student1User.Student!.sid,
      course_id: course2.cid,
      status: 'Active',
    },
  });

  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment003',
      student_id: student2User.Student!.sid,
      course_id: course1.cid,
      status: 'Active',
    },
  });

  // Create Classes
  const class1 = await prisma.class.create({
    data: {
      clid: 'class001',
      name: 'CS101 - Section A',
      schedule_json: JSON.stringify({
        day: 'Monday',
        start: '09:00',
        end: '11:00',
        room: 'CS-101',
      }),
      location: 'Computer Science Building - Room 101',
      status: 'Active',
      course_id: course1.cid,
      lecturer_id: lecturer1User.Lecturer!.lid,
    },
  });

  const class2 = await prisma.class.create({
    data: {
      clid: 'class002',
      name: 'MATH201 - Section A',
      schedule_json: JSON.stringify({
        day: 'Wednesday',
        start: '14:00',
        end: '16:00',
        room: 'MATH-201',
      }),
      location: 'Mathematics Building - Room 201',
      status: 'Active',
      course_id: course2.cid,
      lecturer_id: lecturer2User.Lecturer!.lid,
    },
  });

  // Create Files
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
      uploader_id: lecturer1User.uid,
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
      uploader_id: lecturer1User.uid,
    },
  });

  // Create Quiz
  const quiz1 = await prisma.quiz.create({
    data: {
      qid: 'quiz001',
      name: 'Python Basics Quiz',
      description: 'Test your knowledge of Python fundamentals',
      settings_json: JSON.stringify({
        timeLimit: 30,
        maxAttempts: 2,
        shuffleQuestions: true,
      }),
      available_from: new Date('2024-01-15T09:00:00Z'),
      available_until: new Date('2024-01-22T23:59:59Z'),
      class_id: class1.clid,
      creator_id: lecturer1User.Lecturer!.lid,
      status: 'published',
    },
  });

  // Create Questions
  const question1 = await prisma.question.create({
    data: {
      ques_id: 'question001',
      content: 'What is the correct way to declare a variable in Python?',
      options_json: JSON.stringify({
        A: 'var x = 10',
        B: 'x = 10',
        C: 'int x = 10',
        D: 'declare x = 10',
      }),
      answer_key_json: JSON.stringify({ correct: 'B' }),
      points: 2.0,
      quiz_id: quiz1.qid,
    },
  });

  const question2 = await prisma.question.create({
    data: {
      ques_id: 'question002',
      content: 'Which of the following are Python data types? (Select all that apply)',
      options_json: JSON.stringify({
        A: 'int',
        B: 'string',
        C: 'list',
        D: 'boolean',
      }),
      answer_key_json: JSON.stringify({ correct: ['A', 'C', 'D'] }),
      points: 3.0,
      quiz_id: quiz1.qid,
    },
  });

  // Create Quiz Attempt
  const attempt1 = await prisma.attempt.create({
    data: {
      atid: 'attempt001',
      score: 4.0,
      max_score: 5.0,
      percentage: 80.0,
      status: 'graded',
      attempt_number: 1,
      quiz_id: quiz1.qid,
      student_id: student1User.Student!.sid,
      submitted_at: new Date('2024-01-16T10:30:00Z'),
    },
  });

  // Create Answers
  await prisma.answer.create({
    data: {
      ansid: 'answer001',
      answer_json: JSON.stringify({ selected: 'B' }),
      is_correct: true,
      points_awarded: 2.0,
      attempt_id: attempt1.atid,
      question_id: question1.ques_id,
      student_id: student1User.Student!.sid,
    },
  });

  await prisma.answer.create({
    data: {
      ansid: 'answer002',
      answer_json: JSON.stringify({ selected: ['A', 'C'] }),
      is_correct: false,
      points_awarded: 2.0, // Partial credit
      attempt_id: attempt1.atid,
      question_id: question2.ques_id,
      student_id: student1User.Student!.sid,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`Created:`);
  console.log(`- 1 Admin user`);
  console.log(`- 2 Lecturer users`);
  console.log(`- 2 Student users`);
  console.log(`- 2 Courses`);
  console.log(`- 2 Classes`);
  console.log(`- 3 Course enrollments`);
  console.log(`- 2 Files`);
  console.log(`- 1 Quiz with 2 questions`);
  console.log(`- 1 Quiz attempt with answers`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });