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
      admin: {
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
      lecturer: {
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
      lecturer: true,
    },
  });

  const lecturer2User = await prisma.user.create({
    data: {
      uid: 'user003',
      username: 'lecturer2',
      hashed_password: 'lecturer123',
      status: 'Active',
      role: 'Lecturer',
      lecturer: {
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
      lecturer: true,
    },
  });

  const lecturer3User = await prisma.user.create({
    data: {
      uid: 'user006',
      username: 'lecturer3',
      hashed_password: 'lecturer123',
      status: 'Active',
      role: 'Lecturer',
      lecturer: {
        create: {
          lid: 'lecturer003',
          name: 'Prof. Michael Chen',
          personal_info_json: JSON.stringify({
            address: '789 Faculty St',
            phone: '+1234567895',
            dob: '1972-03-12',
            department: 'Computer Science',
          }),
        },
      },
    },
    include: {
      lecturer: true,
    },
  });

  const lecturer4User = await prisma.user.create({
    data: {
      uid: 'user007',
      username: 'lecturer4',
      hashed_password: 'lecturer123',
      status: 'Active',
      role: 'Lecturer',
      lecturer: {
        create: {
          lid: 'lecturer004',
          name: 'Dr. Sarah Williams',
          personal_info_json: JSON.stringify({
            address: '234 Academic Blvd',
            phone: '+1234567896',
            dob: '1980-07-25',
            department: 'Mathematics',
          }),
        },
      },
    },
    include: {
      lecturer: true,
    },
  });

  const lecturer5User = await prisma.user.create({
    data: {
      uid: 'user008',
      username: 'lecturer5',
      hashed_password: 'lecturer123',
      status: 'Active',
      role: 'Lecturer',
      lecturer: {
        create: {
          lid: 'lecturer005',
          name: 'Prof. David Brown',
          personal_info_json: JSON.stringify({
            address: '567 Professor Lane',
            phone: '+1234567897',
            dob: '1976-11-30',
            department: 'Computer Science',
          }),
        },
      },
    },
    include: {
      lecturer: true,
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
      student: {
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
      student: true,
    },
  });

  const student2User = await prisma.user.create({
    data: {
      uid: 'user005',
      username: 'student2',
      hashed_password: 'student123',
      status: 'Active',
      role: 'Student',
      student: {
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
      student: true,
    },
  });

  const student3User = await prisma.user.create({
    data: {
      uid: 'user009',
      username: 'student3',
      hashed_password: 'student123',
      status: 'Active',
      role: 'Student',
      student: {
        create: {
          sid: 'student003',
          name: 'Charlie Davis',
          major: 'Computer Science',
          personal_info_json: JSON.stringify({
            address: '111 Campus Dr',
            phone: '+1234567898',
            dob: '2001-01-15',
            year: 'Sophomore',
          }),
        },
      },
    },
    include: {
      student: true,
    },
  });

  const student4User = await prisma.user.create({
    data: {
      uid: 'user010',
      username: 'student4',
      hashed_password: 'student123',
      status: 'Active',
      role: 'Student',
      student: {
        create: {
          sid: 'student004',
          name: 'Diana Martinez',
          major: 'Mathematics',
          personal_info_json: JSON.stringify({
            address: '222 Student Blvd',
            phone: '+1234567899',
            dob: '2000-06-20',
            year: 'Junior',
          }),
        },
      },
    },
    include: {
      student: true,
    },
  });

  const student5User = await prisma.user.create({
    data: {
      uid: 'user011',
      username: 'student5',
      hashed_password: 'student123',
      status: 'Active',
      role: 'Student',
      student: {
        create: {
          sid: 'student005',
          name: 'Eva Thompson',
          major: 'Computer Science',
          personal_info_json: JSON.stringify({
            address: '333 Residence Hall',
            phone: '+1234567900',
            dob: '2001-09-10',
            year: 'Sophomore',
          }),
        },
      },
    },
    include: {
      student: true,
    },
  });

  const student6User = await prisma.user.create({
    data: {
      uid: 'user012',
      username: 'student6',
      hashed_password: 'student123',
      status: 'Active',
      role: 'Student',
      student: {
        create: {
          sid: 'student006',
          name: 'Frank Garcia',
          major: 'Mathematics',
          personal_info_json: JSON.stringify({
            address: '444 College St',
            phone: '+1234567901',
            dob: '2000-12-05',
            year: 'Junior',
          }),
        },
      },
    },
    include: {
      student: true,
    },
  });

  const student7User = await prisma.user.create({
    data: {
      uid: 'user013',
      username: 'student7',
      hashed_password: 'student123',
      status: 'Active',
      role: 'Student',
      student: {
        create: {
          sid: 'student007',
          name: 'Grace Lee',
          major: 'Computer Science',
          personal_info_json: JSON.stringify({
            address: '555 University Way',
            phone: '+1234567902',
            dob: '2001-04-18',
            year: 'Sophomore',
          }),
        },
      },
    },
    include: {
      student: true,
    },
  });

  const student8User = await prisma.user.create({
    data: {
      uid: 'user014',
      username: 'student8',
      hashed_password: 'student123',
      status: 'Active',
      role: 'Student',
      student: {
        create: {
          sid: 'student008',
          name: 'Henry Zhang',
          major: 'Mathematics',
          personal_info_json: JSON.stringify({
            address: '666 Academic Ave',
            phone: '+1234567903',
            dob: '1999-08-28',
            year: 'Senior',
          }),
        },
      },
    },
    include: {
      student: true,
    },
  });

  const student9User = await prisma.user.create({
    data: {
      uid: 'user015',
      username: 'student9',
      hashed_password: 'student123',
      status: 'Active',
      role: 'Student',
      student: {
        create: {
          sid: 'student009',
          name: 'Isabella Rodriguez',
          major: 'Computer Science',
          personal_info_json: JSON.stringify({
            address: '777 Student Plaza',
            phone: '+1234567904',
            dob: '2001-02-14',
            year: 'Sophomore',
          }),
        },
      },
    },
    include: {
      student: true,
    },
  });

  const student10User = await prisma.user.create({
    data: {
      uid: 'user016',
      username: 'student10',
      hashed_password: 'student123',
      status: 'Active',
      role: 'Student',
      student: {
        create: {
          sid: 'student010',
          name: 'Jack Peterson',
          major: 'Computer Science',
          personal_info_json: JSON.stringify({
            address: '888 Campus Circle',
            phone: '+1234567905',
            dob: '2000-11-22',
            year: 'Junior',
          }),
        },
      },
    },
    include: {
      student: true,
    },
  });

  // Create Courses with many-to-many lecturer relationship
  const course1 = await prisma.course.create({
    data: {
      cid: 'course001',
      code: 'CS101',
      name: 'Introduction to Programming',
      description: 'Basic programming concepts using Python',
      credits: 3,
      lecturers: {
        connect: [
          { lid: lecturer1User.lecturer!.lid },
          { lid: lecturer3User.lecturer!.lid },
        ]
      }
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
          { lid: lecturer1User.lecturer!.lid },
          { lid: lecturer2User.lecturer!.lid },
          { lid: lecturer4User.lecturer!.lid },
        ]
      }
    },
  });

  // Create Course Enrollments
  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment001',
      student_id: student1User.student!.sid,
      course_id: course1.cid,
      status: 'Pending',
    },
  });

  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment002',
      student_id: student1User.student!.sid,
      course_id: course2.cid,
      status: 'Pending',
    },
  });

  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment003',
      student_id: student2User.student!.sid,
      course_id: course1.cid,
      status: 'Pending',
    },
  });

  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment004',
      student_id: student3User.student!.sid,
      course_id: course1.cid,
      status: 'Pending',
    },
  });

  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment005',
      student_id: student4User.student!.sid,
      course_id: course1.cid,
      status: 'Pending',
    },
  });

  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment006',
      student_id: student5User.student!.sid,
      course_id: course1.cid,
      status: 'Pending',
    },
  });

  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment007',
      student_id: student6User.student!.sid,
      course_id: course1.cid,
      status: 'Pending',
    },
  });

  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment008',
      student_id: student7User.student!.sid,
      course_id: course1.cid,
      status: 'Pending',
    },
  });

  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment009',
      student_id: student8User.student!.sid,
      course_id: course1.cid,
      status: 'Pending',
    },
  });

  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment010',
      student_id: student9User.student!.sid,
      course_id: course1.cid,
      status: 'Pending',
    },
  });

  await prisma.courseEnrollment.create({
    data: {
      ceid: 'enrollment011',
      student_id: student10User.student!.sid,
      course_id: course1.cid,
      status: 'Pending',
    },
  });

  // Create Classes with M-N relationship to Students
  const class1 = await prisma.class.create({
    data: {
      clid: 'class001',
      name: 'CS101 - L1',
      schedule_json: JSON.stringify({
        day: 'Monday',
        start: '09:00',
        end: '11:00',
      }),
      location: 'Computer Science Building - Room 101',
      status: 'Active',
      course_id: course1.cid,
      lecturer_id: lecturer1User.lecturer!.lid,
      students: {
        connect: [
          { sid: student1User.student!.sid },
          { sid: student3User.student!.sid },
          { sid: student5User.student!.sid },
        ]
      }
    },
  });

  const class2 = await prisma.class.create({
    data: {
      clid: 'class002',
      name: 'CS101 - L2',
      schedule_json: JSON.stringify({
        day: 'Wednesday',
        start: '14:00',
        end: '16:00',
      }),
      location: 'Computer Science Building - Room 102',
      status: 'Active',
      course_id: course1.cid,
      lecturer_id: lecturer3User.lecturer!.lid,
      students: {
        connect: [
          { sid: student1User.student!.sid },
          { sid: student2User.student!.sid },
          { sid: student7User.student!.sid },
        ]
      }
    },
  });

  const class3 = await prisma.class.create({
    data: {
      clid: 'class003',
      name: 'MT105 - L1',
      schedule_json: JSON.stringify({
        day: 'Tuesday',
        start: '10:00',
        end: '12:00',
      }),
      location: 'Mathematics Building - Room 201',
      status: 'Active',
      course_id: course2.cid,
      lecturer_id: lecturer2User.lecturer!.lid,
      students: {
        connect: [
          { sid: student1User.student!.sid },
          { sid: student4User.student!.sid },
          { sid: student6User.student!.sid },
          { sid: student8User.student!.sid },
        ]
      }
    },
  });

  const class4 = await prisma.class.create({
    data: {
      clid: 'class004',
      name: 'CS101 - L3',
      schedule_json: JSON.stringify({
        day: 'Thursday',
        start: '13:00',
        end: '15:00',
      }),
      location: 'Computer Science Building - Room 103',
      status: 'Active',
      course_id: course1.cid,
      lecturer_id: lecturer5User.lecturer!.lid,
      students: {
        connect: [
          { sid: student1User.student!.sid },
          { sid: student9User.student!.sid },
          { sid: student10User.student!.sid },
        ]
      }
    },
  });

  const class5 = await prisma.class.create({
    data: {
      clid: 'class005',
      name: 'MT105 - L2',
      schedule_json: JSON.stringify({
        day: 'Friday',
        start: '15:00',
        end: '17:00',
      }),
      location: 'Mathematics Building - Room 202',
      status: 'Active',
      course_id: course2.cid,
      lecturer_id: lecturer4User.lecturer!.lid,
      students: {
        connect: [
          { sid: student1User.student!.sid },
          { sid: student3User.student!.sid },
          { sid: student5User.student!.sid },
        ]
      }
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

  // Create Quizzes for class001 (CS101 - L1) created by lecturer001
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
      creator_id: lecturer1User.lecturer!.lid,
      status: 'published',
    },
  });

  const quiz2 = await prisma.quiz.create({
    data: {
      qid: 'quiz002',
      name: 'Variables and Data Types',
      description: 'Quiz on Python variables, data types, and type conversion',
      settings_json: JSON.stringify({
        timeLimit: 25,
        maxAttempts: 2,
        shuffleQuestions: false,
      }),
      available_from: new Date('2024-01-20T10:00:00Z'),
      available_until: new Date('2024-01-27T23:59:59Z'),
      class_id: class1.clid,
      creator_id: lecturer1User.lecturer!.lid,
      status: 'published',
    },
  });

  const quiz3 = await prisma.quiz.create({
    data: {
      qid: 'quiz003',
      name: 'Control Flow and Loops',
      description: 'Assessment on if statements, for loops, and while loops',
      settings_json: JSON.stringify({
        timeLimit: 40,
        maxAttempts: 3,
        shuffleQuestions: true,
      }),
      available_from: new Date('2024-02-01T09:00:00Z'),
      available_until: new Date('2024-02-08T23:59:59Z'),
      class_id: class1.clid,
      creator_id: lecturer1User.lecturer!.lid,
      status: 'published',
    },
  });

  const quiz4 = await prisma.quiz.create({
    data: {
      qid: 'quiz004',
      name: 'Functions and Modules',
      description: 'Quiz covering function definition, parameters, return values, and importing modules',
      settings_json: JSON.stringify({
        timeLimit: 35,
        maxAttempts: 2,
        shuffleQuestions: true,
      }),
      available_from: new Date('2024-02-10T10:00:00Z'),
      available_until: new Date('2024-02-17T23:59:59Z'),
      class_id: class1.clid,
      creator_id: lecturer1User.lecturer!.lid,
      status: 'draft',
    },
  });

  const quiz5 = await prisma.quiz.create({
    data: {
      qid: 'quiz005',
      name: 'Lists, Dictionaries, and Sets',
      description: 'Comprehensive assessment on Python collections and data structures',
      settings_json: JSON.stringify({
        timeLimit: 45,
        maxAttempts: 2,
        shuffleQuestions: true,
      }),
      available_from: new Date('2024-02-20T09:00:00Z'),
      available_until: new Date('2024-02-27T23:59:59Z'),
      class_id: class1.clid,
      creator_id: lecturer1User.lecturer!.lid,
      status: 'draft',
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
      student_id: student1User.student!.sid,
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
      student_id: student1User.student!.sid,
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
      student_id: student1User.student!.sid,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`Created:`);
  console.log(`- 1 Admin user`);
  console.log(`- 5 Lecturer users`);
  console.log(`- 10 Student users`);
  console.log(`- 2 Courses (CS101 with 2 lecturers, MT105 with 2 lecturers)`);
  console.log(`- 5 Classes (CS101-L1, CS101-L2, CS101-L3, MT105-L1, MT105-L2)`);
  console.log(`- Student001 assigned to all 5 classes`);
  console.log(`- 11 Course enrollments (10 students enrolled in CS101)`);
  console.log(`- 2 Files`);
  console.log(`- 5 Quizzes for class001 (CS101-L1) created by lecturer001`);
  console.log(`- 2 Questions (for quiz001)`);
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