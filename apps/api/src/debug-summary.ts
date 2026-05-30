import { prisma } from "./db/prisma.js";
import { getSummary } from "./modules/summary/summary.service.js";

async function main() {
  console.log("Fetching all users from database...");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
    }
  });
  console.log(`Found ${users.length} users:`);
  for (const user of users) {
    console.log(`- ${user.name} (${user.email}) [ID: ${user.id}]`);
    try {
      console.log(`Calling getSummary for ${user.email}...`);
      const summary = await getSummary(user.id);
      console.log(`Summary fetched successfully for ${user.email}!`);
      console.log(`Income: ${summary.totalIncome}, Expense: ${summary.totalExpense}`);
    } catch (error) {
      console.error(`Error fetching summary for user ${user.email}:`, error);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
