import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAiSeedData(): Promise<void> {
  console.log('Clearing AI conversations and messages...');

  await prisma.aiConversation.deleteMany({});
  await prisma.aiMessage.deleteMany({});

  console.log('AI conversations and messages cleared successfully');
}

clearAiSeedData()
  .catch((error) => {
    console.error('Error clearing AI seed data:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });