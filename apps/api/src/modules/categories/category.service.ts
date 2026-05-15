import type { TransactionType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

type GetCategoriesInput = {
  type?: TransactionType;
};

function mapCategory(category: {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
}) {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    isDefault: category.isDefault
  };
}

export async function getCategoriesService(input: GetCategoriesInput) {
  const categories = await prisma.category.findMany({
    where: {
      type: input.type
    },
    orderBy: [
      {
        type: "asc"
      },
      {
        name: "asc"
      }
    ]
  });

  return categories.map(mapCategory);
}