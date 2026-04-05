import { PrismaClient } from '@prisma/client';

async function createNotifications(prisma: PrismaClient): Promise<void> {
  await prisma.notification.create({
    data: {
      nid: 'notification001',
      title: 'New Quiz Available',
      message:
        'A new quiz "Variables and Data Types" has been posted for CS101 - L1. Available until Jan 27, 2024.',
      type: 'quiz_posted',
      is_read: false,
      related_type: 'Quiz',
      related_id: 'quiz002',
      user_id: 'user004',
    },
  });

  await prisma.notification.create({
    data: {
      nid: 'notification002',
      title: 'Quiz Results Available',
      message: 'Your results for "Python Basics Quiz" are now available. You scored 60% (3/5 correct).',
      type: 'grade_released',
      is_read: false,
      related_type: 'Attempt',
      related_id: 'attempt001',
      user_id: 'user004',
    },
  });

  await prisma.notification.create({
    data: {
      nid: 'notification003',
      title: 'Welcome to CS101',
      message:
        'Welcome to CS101 - Introduction to Programming! Please check the course materials and syllabus.',
      type: 'general',
      is_read: true,
      related_type: 'Course',
      related_id: 'course001',
      user_id: 'user004',
    },
  });
}

async function createLogs(prisma: PrismaClient): Promise<void> {
  const logs = [
    ['log001', 'login', 'User', 'user002', 'user002', '2024-01-10T08:00:00Z'],
    ['log002', 'upload_file', 'File', 'file001', 'user002', '2024-01-10T08:15:00Z'],
    ['log003', 'upload_file', 'File', 'file002', 'user002', '2024-01-10T08:20:00Z'],
    ['log004', 'create_quiz', 'Quiz', 'quiz001', 'user002', '2024-01-12T14:30:00Z'],
    ['log005', 'create_quiz', 'Quiz', 'quiz002', 'user002', '2024-01-14T10:00:00Z'],
    ['log006', 'create_quiz', 'Quiz', 'quiz003', 'user002', '2024-01-18T09:30:00Z'],
    ['log007', 'create_quiz', 'Quiz', 'quiz004', 'user002', '2024-01-25T11:00:00Z'],
    ['log008', 'create_quiz', 'Quiz', 'quiz005', 'user002', '2024-02-01T13:45:00Z'],
    ['log009', 'login', 'User', 'user004', 'user004', '2024-01-15T20:00:00Z'],
    ['log010', 'create_attempt', 'Attempt', 'attempt001', 'user004', '2024-01-16T10:00:00Z'],
    ['log011', 'submit_attempt', 'Attempt', 'attempt001', 'user004', '2024-01-16T10:30:00Z'],
    ['log012', 'update_attempt', 'Attempt', 'attempt001', 'user002', '2024-01-16T15:00:00Z'],
    ['log013', 'login', 'User', 'user004', 'user004', '2024-01-17T09:00:00Z'],
    ['log014', 'view_notification', 'Notification', 'notification001', 'user004', '2024-01-17T09:05:00Z'],
    ['log015', 'mark_notification_read', 'Notification', 'notification002', 'user004', '2024-01-17T09:06:00Z'],
    ['log016', 'download_file', 'File', 'file001', 'user004', '2024-01-17T09:15:00Z'],
    ['log017', 'download_file', 'File', 'file002', 'user004', '2024-01-17T09:18:00Z'],
    ['log018', 'update_class', 'Class', 'class001', 'user002', '2024-01-18T07:45:00Z'],
    ['log019', 'grade_attempt', 'Attempt', 'attempt001', 'user002', '2024-01-18T08:15:00Z'],
    ['log020', 'view_results', 'Attempt', 'attempt001', 'user004', '2024-01-18T09:00:00Z'],
    ['log021', 'approve_enrollment', 'CourseEnrollment', 'enrollment001', 'user002', '2024-01-19T08:00:00Z'],
    ['log022', 'approve_enrollment', 'CourseEnrollment', 'enrollment002', 'user002', '2024-01-19T08:10:00Z'],
    ['log023', 'approve_enrollment', 'CourseEnrollment', 'enrollment003', 'user002', '2024-01-19T08:20:00Z'],
    ['log024', 'join_class', 'Class', 'class002', 'user005', '2024-01-20T13:00:00Z'],
    ['log025', 'join_class', 'Class', 'class003', 'user010', '2024-01-20T13:05:00Z'],
    ['log026', 'join_class', 'Class', 'class005', 'user009', '2024-01-20T13:10:00Z'],
    ['log027', 'post_quiz_results', 'Quiz', 'quiz001', 'user002', '2024-01-21T10:00:00Z'],
    ['log028', 'login', 'User', 'user003', 'user003', '2024-01-22T07:45:00Z'],
    ['log029', 'failed_login', 'User', 'user001', 'user001', '2024-01-22T01:12:00Z'],
    ['log030', 'disable_audit_log_attempt', 'Log', 'system_audit', 'user001', '2024-01-22T01:14:00Z'],
    ['log031', 'mass_export_user_data', 'User', 'bulk_export_20240122', 'user001', '2024-01-22T01:19:00Z'],
    ['log032', 'permission_escalation_attempt', 'Admin', 'admin001', 'user001', '2024-01-22T01:21:00Z'],
    ['log033', 'delete_log_attempt', 'Log', 'log012', 'user001', '2024-01-22T01:24:00Z'],
    ['log034', 'access_denied', 'System', 'security_policy_guardrail', 'user001', '2024-01-22T01:25:00Z'],
  ] as const;

  for (const [logid, action, resource_type, resource_id, user_id, createdAt] of logs) {
    await prisma.log.create({
      data: {
        logid,
        action,
        resource_type,
        resource_id,
        user_id,
        created_at: new Date(createdAt),
      },
    });
  }
}
export async function seedSystemActivity(prisma: PrismaClient): Promise<void> {
  await createNotifications(prisma);
  await createLogs(prisma);
}
