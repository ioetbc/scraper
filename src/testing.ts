
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client/generated/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: adapter });

async function main() {
  const val = await prisma.post.findMany({
    take: 10,
  });
  console.log(val);
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });