export type RagCapabilityEntry = {
  id: string;
  description: string;
  allowedRoles: string[];
  parameters: string;
  required?: string[];
};

export const logEntries: RagCapabilityEntry[] = [
  {
    id: 'log-retrive',
    description: 'Retrive logs from the system with pagination',
    allowedRoles: ['Admin'],
    parameters: 'limit: number, offset: number',
    required: [],
  },
  {
    id: 'log-from-user',
    description: 'Retrive logs related to a specific user',
    allowedRoles: ['Admin'],
    parameters: 'userId: string, limit: number, offset: number',
    required: ['userId'],
  }
];


export const coursesEntries: RagCapabilityEntry[] = [
  {
    id: 'enrollments',
    description: 'Retrive course enrollments with pagination',
    allowedRoles: ['Admin'],
    parameters: 'status: string (Pending, Unregistered, Completed), start_range: string (eg 2025-01-01T00:00:00.000Z), end_range: string (eg 2025-12-31T23:59:59.999Z), limit: number, offset: number',
    required: [],
  }
];

export const analyticsEntries: RagCapabilityEntry[] = [
  {
    id: 'class-overview',
    description:
      'Retrieve an overview of class quiz performance including attempts, scores, pass rate, and per-student summary. If user mentions quiz name (e.g., "variable and data types"), first call class-quizzes to get the quiz ID mapping, then use the resolved quiz ID here.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string, quizId?: string',
    required: ['classId'],
  },
  {
    id: 'class-files',
    description:
      'Retrieve files in a class with file name and file id for quick browsing.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string',
    required: ['classId'],
  },
  {
    id: 'class-quizzes',
    description:
      'Retrieve quizzes in a class with quiz name and quiz id.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string',
    required: ['classId'],
  },
  {
    id: 'class-students',
    description:
      'Retrieve students in a class with student name and student id.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string',
    required: ['classId'],
  },
  {
    id: 'class-lecturer',
    description:
      'Retrieve the lecturer assigned to a class with lecturer name and lecturer id.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string',
    required: ['classId'],
  },
  {
    id: 'analyze-quiz-performance',
    description:
      'Query students in a class by average quiz score with customizable filters. If user mentions quiz name (e.g., "variable and data types"), first call class-quizzes to resolve the quiz ID.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string, quizId?: string, take?: number, threshold?: number, comparison?: string (gt, gte, lt, lte)',
    required: ['classId'],
  },
  {
    id: 'teaching-recommendation',
    description:
      'Retrieve monthly quiz completion trend data for a class to support teaching recommendations and engagement analysis.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string',
    required: ['classId'],
  },
  {
    id: 'knowledge-gap',
    description:
      'Retrieve question-level correctness and common wrong answers for a class or quiz to analyze misconceptions and knowledge gaps. If user mentions quiz name (e.g., "variable and data types"), first call class-quizzes to resolve the quiz ID.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string, quizId?: string',
    required: ['classId'],
  },
  {
    id: 'student-quiz-history',
    description:
      'Retrieve the full quiz attempt history of a specific student in a class, including per-quiz scores, attempt count, and latest pass status. Use when the user asks about an individual student\'s progress or quiz performance. Requires studentId; call class-students first if only the student name is known.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string, studentId: string',
    required: ['classId', 'studentId'],
  },
  {
    id: 'class-engagement',
    description:
      'Retrieve per-student engagement metrics for a class: last login date, total sessions, and weekly or monthly activity frequency. Use to identify inactive or disengaged students. Can filter by days_inactive to surface students who have not logged in recently.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string, days_inactive?: number',
    required: ['classId'],
  },
  {
    id: 'at-risk-students',
    description:
      'Identify students who are at risk of failing based on combined low quiz scores and low engagement. Returns a ranked list with risk score, average quiz grade, days since last login, and missing quiz count. Use when the user asks about students who need intervention, are likely to fail, or are falling behind.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string, score_threshold?: number, inactive_days?: number',
    required: ['classId'],
  },
  {
    id: 'submission-summary',
    description:
      'Retrieve submission statistics for quizzes in a class: total students, submitted count, missing count, late count, and completion rate per quiz. Use when the user asks about submission rates, who has not submitted, or overall assignment completion. If user mentions a quiz name, first call class-quizzes to resolve the quiz ID.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string, quizId?: string',
    required: ['classId'],
  },
  {
    id: 'class-announcements',
    description:
      'Retrieve the list of announcements sent in a class, including title, sent date, sender, and read receipt count. Use when the user asks about past notifications, whether students were informed of an event, or wants to audit communication history in a class.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string, limit?: number, offset?: number',
    required: ['classId'],
  },
  {
    id: 'multi-class-comparison',
    description:
      'Compare quiz performance and engagement metrics across multiple classes. Returns a ranked summary table with average score, pass rate, quiz completion rate, and engagement score per class. Use when the user wants to benchmark classes or identify outlier classes system-wide. Admin-only because it exposes cross-class data.',
    allowedRoles: ['Admin'],
    parameters: 'classIds: string (comma-separated list of classId), metric?: string (score, pass_rate, completion, engagement)',
    required: ['classIds'],
  },
];

export const RAG_CAPABILITY_ENTRIES: RagCapabilityEntry[] = [
  ...logEntries,
  ...coursesEntries,
  ...analyticsEntries,
];

export const RAG_CAPABILITY_REQUIRED_PARAMS_BY_ID: Record<string, string[]> =
  RAG_CAPABILITY_ENTRIES.reduce<Record<string, string[]>>(
    (acc, entry) => {
      acc[entry.id] = entry.required ?? [];
      return acc;
    },
    {},
  );
