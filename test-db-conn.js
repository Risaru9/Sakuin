import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Menghubungkan ke database...");
  try {
    const userCount = await prisma.user.count();
    console.log(`Koneksi database sukses! Total pengguna di DB: ${userCount}`);
    
    const latestTx = await prisma.transaction.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true }
    });
    console.log("Transaksi terbaru:", latestTx);
  } catch (error) {
    console.error("Gagal melakukan query database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
