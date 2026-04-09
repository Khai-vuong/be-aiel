export type RagCapabilityEntry = {
  id: string;
  description: string;
  allowedRoles: string[];
  parameters: string;
};

export const logEntries: RagCapabilityEntry[] = [
  {
    id: 'log-retrive',
    description: 'Retrive logs from the system with pagination',
    allowedRoles: ['Admin'],
    parameters: 'limit: number, offset: number',
  },
  {
    id: 'log-from-user',
    description: 'Retrive logs related to a specific user',
    allowedRoles: ['Admin'],
    parameters: 'userId: string, limit: number, offset: number',
  }
];


export const coursesEntries: RagCapabilityEntry[] = [
  {
    id: 'enrollments',
    description: 'Retrive course enrollments with pagination',
    allowedRoles: ['Admin'],
    parameters: 'status: string (Pending, Unregistered, Completed), start_range: string (eg 2025-01-01T00:00:00.000Z), end_range: string (eg 2025-12-31T23:59:59.999Z), limit: number, offset: number',
  }
];

export const analyticsEntries: RagCapabilityEntry[] = [
  {
    id: 'class-overview',
    description:
      'Retrieve an overview of class quiz performance including attempts, scores, pass rate, and per-student summary.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string, quizId?: string',
  },
  {
    id: 'analyze-quiz-performance',
    description:
      'Query students in a class by average quiz score with customizable filters.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string, quizId?: string, take?: number, threshold?: number, comparison?: string (gt, gte, lt, lte)',
  },
  {
    id: 'teaching-recommendation',
    description:
      'Retrieve monthly quiz completion trend data for a class to support teaching recommendations and engagement analysis.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string',
  },
  {
    id: 'knowledge-gap',
    description:
      'Retrieve question-level correctness and common wrong answers for a class or quiz to analyze misconceptions and knowledge gaps.',
    allowedRoles: ['Admin', 'Lecturer'],
    parameters: 'classId: string, quizId?: string',
  },
];

export const RAG_CAPABILITY_ENTRIES: RagCapabilityEntry[] = [
  ...logEntries,
  ...coursesEntries,
  ...analyticsEntries,
];
