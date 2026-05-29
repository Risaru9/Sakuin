import { prisma } from "../src/db/prisma.js";
import { defaultCategories } from "../src/modules/categories/default-categories.js";
import { assertSafeTestDatabase } from "./helpers/database-safety.js";

export default async function () {
  assertSafeTestDatabase();

  console.log("Global setup: seeding default categories...");

  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: {
        id: category.id
      },
      update: {
        userId: null,
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        isDefault: category.isDefault
      },
      create: {
        ...category,
        userId: null
      }
    });
  }

  await prisma.category.deleteMany({
    where: {
      id: "cat_expense_fuel",
      userId: null,
      isDefault: true,
      transactions: {
        none: {}
      },
      recurringRules: {
        none: {}
      }
    }
  });

  console.log("Global setup: database seeded successfully.");

  // Disconnect prisma client so the process doesn't hang
  await prisma.$disconnect();
}
