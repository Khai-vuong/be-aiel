import { PrismaClient } from '@prisma/client';
import { createIfMissing } from './utils';

export async function seedUsers(prisma: PrismaClient): Promise<void> {
  await createIfMissing(
    prisma.user.findUnique({ where: { uid: 'user001' }, select: { uid: true } }),
    () =>
      prisma.user.create({
        data: {
          uid: 'user001',
          username: 'admin',
          hashed_password: 'admin123',
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
      }),
    'User user001',
  );

  const lecturers = [
    {
      uid: 'user002',
      username: 'lecturer1',
      lid: 'lecturer001',
      name: 'Dr. John Smith',
      address: '123 University Ave',
      phone: '+1234567891',
      dob: '1975-05-15',
      department: 'Computer Science',
    },
    {
      uid: 'user003',
      username: 'lecturer2',
      lid: 'lecturer002',
      name: 'Dr. Jane Doe',
      address: '456 Campus Rd',
      phone: '+1234567892',
      dob: '1978-08-22',
      department: 'Mathematics',
    },
    {
      uid: 'user006',
      username: 'lecturer3',
      lid: 'lecturer003',
      name: 'Prof. Michael Chen',
      address: '789 Faculty St',
      phone: '+1234567895',
      dob: '1972-03-12',
      department: 'Computer Science',
    },
    {
      uid: 'user007',
      username: 'lecturer4',
      lid: 'lecturer004',
      name: 'Dr. Sarah Williams',
      address: '234 Academic Blvd',
      phone: '+1234567896',
      dob: '1980-07-25',
      department: 'Mathematics',
    },
    {
      uid: 'user008',
      username: 'lecturer5',
      lid: 'lecturer005',
      name: 'Prof. David Brown',
      address: '567 Professor Lane',
      phone: '+1234567897',
      dob: '1976-11-30',
      department: 'Computer Science',
    },
  ];

  for (const lecturer of lecturers) {
    await createIfMissing(
      prisma.user.findUnique({ where: { uid: lecturer.uid }, select: { uid: true } }),
      () =>
        prisma.user.create({
          data: {
            uid: lecturer.uid,
            username: lecturer.username,
            hashed_password: 'lecturer123',
            status: 'Active',
            role: 'Lecturer',
            lecturer: {
              create: {
                lid: lecturer.lid,
                name: lecturer.name,
                personal_info_json: JSON.stringify({
                  address: lecturer.address,
                  phone: lecturer.phone,
                  dob: lecturer.dob,
                  department: lecturer.department,
                }),
              },
            },
          },
        }),
      `User ${lecturer.uid}`,
    );
  }

  const students = [
    {
      uid: 'user004',
      username: 'student1',
      sid: 'student001',
      name: 'Alice Johnson',
      major: 'Computer Science',
      address: '789 Student St',
      phone: '+1234567893',
      dob: '2000-03-10',
      year: 'Junior',
    },
    {
      uid: 'user005',
      username: 'student2',
      sid: 'student002',
      name: 'Bob Wilson',
      major: 'Mathematics',
      address: '321 Dorm Ave',
      phone: '+1234567894',
      dob: '1999-11-25',
      year: 'Senior',
    },
    {
      uid: 'user009',
      username: 'student3',
      sid: 'student003',
      name: 'Charlie Davis',
      major: 'Computer Science',
      address: '111 Campus Dr',
      phone: '+1234567898',
      dob: '2001-01-15',
      year: 'Sophomore',
    },
    {
      uid: 'user010',
      username: 'student4',
      sid: 'student004',
      name: 'Diana Martinez',
      major: 'Mathematics',
      address: '222 Student Blvd',
      phone: '+1234567899',
      dob: '2000-06-20',
      year: 'Junior',
    },
    {
      uid: 'user011',
      username: 'student5',
      sid: 'student005',
      name: 'Eva Thompson',
      major: 'Computer Science',
      address: '333 Residence Hall',
      phone: '+1234567900',
      dob: '2001-09-10',
      year: 'Sophomore',
    },
    {
      uid: 'user012',
      username: 'student6',
      sid: 'student006',
      name: 'Frank Garcia',
      major: 'Mathematics',
      address: '444 College St',
      phone: '+1234567901',
      dob: '2000-12-05',
      year: 'Junior',
    },
    {
      uid: 'user013',
      username: 'student7',
      sid: 'student007',
      name: 'Grace Lee',
      major: 'Computer Science',
      address: '555 University Way',
      phone: '+1234567902',
      dob: '2001-04-18',
      year: 'Sophomore',
    },
    {
      uid: 'user014',
      username: 'student8',
      sid: 'student008',
      name: 'Henry Zhang',
      major: 'Mathematics',
      address: '666 Academic Ave',
      phone: '+1234567903',
      dob: '1999-08-28',
      year: 'Senior',
    },
    {
      uid: 'user015',
      username: 'student9',
      sid: 'student009',
      name: 'Isabella Rodriguez',
      major: 'Computer Science',
      address: '777 Student Plaza',
      phone: '+1234567904',
      dob: '2001-02-14',
      year: 'Sophomore',
    },
    {
      uid: 'user016',
      username: 'student10',
      sid: 'student010',
      name: 'Jack Peterson',
      major: 'Computer Science',
      address: '888 Campus Circle',
      phone: '+1234567905',
      dob: '2000-11-22',
      year: 'Junior',
    },
  ];

  for (const student of students) {
    await createIfMissing(
      prisma.user.findUnique({ where: { uid: student.uid }, select: { uid: true } }),
      () =>
        prisma.user.create({
          data: {
            uid: student.uid,
            username: student.username,
            hashed_password: 'student123',
            status: 'Active',
            role: 'Student',
            student: {
              create: {
                sid: student.sid,
                name: student.name,
                major: student.major,
                personal_info_json: JSON.stringify({
                  address: student.address,
                  phone: student.phone,
                  dob: student.dob,
                  year: student.year,
                }),
              },
            },
          },
        }),
      `User ${student.uid}`,
    );
  }
}
