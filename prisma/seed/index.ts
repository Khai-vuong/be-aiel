import { PrismaClient } from '@prisma/client';
import { seedAcademics } from './academics.seed';
import { seedSystemActivity } from './activity.seed';
import { seedQuizzes } from './quizzes.seed';
import { seedUsers } from './users.seed';
import { SEED_MODULES, SeedModule } from './types';

const prisma = new PrismaClient();

const moduleRunners: Record<SeedModule, (client: PrismaClient) => Promise<void>> = {
  users: seedUsers,
  academics: seedAcademics,
  quizzes: seedQuizzes,
  systemActivity: seedSystemActivity,
};

function parseRequestedModules(args: string[]): SeedModule[] {
  if (args.length === 0) {
    return [...SEED_MODULES];
  }

  const normalized = args
    .flatMap((arg) => arg.split(','))
    .map((arg) => arg.trim().toLowerCase())
    .filter(Boolean);

  if (normalized.includes('all')) {
    return [...SEED_MODULES];
  }

  const uniqueModules = [...new Set(normalized)];
  const invalid = uniqueModules.filter((name) => !SEED_MODULES.includes(name as SeedModule));

  if (invalid.length > 0) {
    throw new Error(
      `Unknown seed module(s): ${invalid.join(', ')}. Valid modules: ${SEED_MODULES.join(', ')}, all`,
    );
  }

  return uniqueModules as SeedModule[];
}

export async function runSeed(modules: SeedModule[]): Promise<void> {
  console.log(`Seeding module(s): ${modules.join(', ')}`);

  for (const moduleName of modules) {
    console.log(`-> Start: ${moduleName}`);
    await moduleRunners[moduleName](prisma);
    console.log(`<- Done: ${moduleName}`);
  }
}

export async function runSeedCli(): Promise<void> {
  const requestedModules = parseRequestedModules(process.argv.slice(2));

  await runSeed(requestedModules);

  console.log('Database seeded successfully');
  console.log(`Executed modules: ${requestedModules.join(', ')}`);
  console.log('Tips:');
  console.log(' - Full seed: npm run db:seed');
  console.log(' - Single module: npm run db:seed -- users');
  console.log(' - Multiple modules: npm run db:seed -- users,academics');
}

runSeedCli()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
