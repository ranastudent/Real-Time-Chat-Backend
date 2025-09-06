import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create users
  const user1 = await prisma.user.upsert({
    where: { phone: '1111111111' },
    update: {},
    create: {
      phone: '1111111111',
      name: 'Client1',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { phone: '2222222222' },
    update: {},
    create: {
      phone: '2222222222',
      name: 'Client2',
    },
  });

  // Create chat
  const chat = await prisma.chat.upsert({
    where: { id: 'room1' }, // use fixed ID for simplicity
    update: {},
    create: {
      id: 'room1',
      isGroup: false,
      createdBy: user1.id,
      title: 'Private Chat',
      participants: {
        create: [
          { userId: user1.id, role: 'owner' },
          { userId: user2.id, role: 'member' },
        ],
      },
    },
  });

  console.log('✅ Seed complete:', { user1, user2, chat });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
