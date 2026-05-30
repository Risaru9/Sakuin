import { getSummary } from "./src/modules/summary/summary.service.js";
import { prisma } from "./src/db/prisma.js";

async function test() {
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users`);
  for (const user of users) {
    console.log(`Testing user: ${user.email}`);
    const summary = await getSummary(user.id);
    try {
      JSON.stringify(summary);
      console.log(`  Serialization OK for ${user.email}`);
    } catch (e) {
      console.error(`  Serialization Error for ${user.email}:`, e);
    }
  }
}
test();
