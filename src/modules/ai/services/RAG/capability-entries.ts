export type RagCapabilityEntry = {
  id: string;
  description: string;
  allowedRoles: string[];
  parameters: string;
};

export const logEntries: RagCapabilityEntry[] = [
  {
    id: 'log-retrive',
    description: 'Retrive logs from the system',
    allowedRoles: ['Admin'],
    parameters: 'limit: number, offset: number, logType: string',
  },
  {
    id: 'log-from-user',
    description: 'Retrive logs related to a specific user',
    allowedRoles: ['Admin'],
    parameters: 'userId: string, limit: number, offset: number',
  }
];

export const RAG_CAPABILITY_ENTRIES: RagCapabilityEntry[] = [...logEntries];
