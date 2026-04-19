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
