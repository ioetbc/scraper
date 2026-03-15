import { PrismaClient } from "../../../prisma/generated/client.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const PLACEHOLDER_USER_ID = "placeholder-user-001";

export async function ensurePlaceholderUser(): Promise<void> {
  await prisma.user.upsert({
    where: { id: PLACEHOLDER_USER_ID },
    update: {},
    create: { id: PLACEHOLDER_USER_ID },
  });
}
