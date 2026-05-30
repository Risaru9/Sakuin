import { Prisma } from "@prisma/client";

try {
  const d1 = new Prisma.Decimal(NaN);
  console.log(d1.toFixed(2));
} catch (e) {
  console.error("Error with NaN:", e);
}
