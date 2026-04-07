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
]

export const RAG_CAPABILITY_ENTRIES: RagCapabilityEntry[] = [...logEntries, ...coursesEntries];
