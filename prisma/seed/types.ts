export const SEED_MODULES = ['users', 'academics', 'quizzes', 'systemActivity'] as const;

export type SeedModule = (typeof SEED_MODULES)[number];
