import { PrismaClient, User } from '@prisma/client';
import DataLoader from 'dataloader';
export const userLoader = (prisma: PrismaClient): DataLoader<string, User | null> => {
  return new DataLoader(async (ids) => {
    const users = await prisma.user.findMany({
      where: { id: { in: ids as string[] } },
    });

    const usersMap = new Map(users.map((user) => [user.id, user]));
    return ids.map((key) => usersMap.get(key) || null);
  });
};
