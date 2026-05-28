import { PrismaClient } from "@prisma/client";
import { defaultCategories } from "../src/modules/categories/default-categories.js";

const prisma = new PrismaClient();

async function main() {
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: {
        id: category.id
      },
      update: {
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        isDefault: category.isDefault
      },
      create: category
    });
  }

  console.log("Default categories seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Failed to seed database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
