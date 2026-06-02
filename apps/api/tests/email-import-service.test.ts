import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { importEmailTransaction } from "../src/modules/email-imports/email-import.service.js";

const createdUserIds = new Set<string>();

async function createTestUser(prefix: string) {
  const user = await prisma.user.create({
    data: {
      name: `Email Import ${prefix}`,
      email: `${prefix}-${randomUUID()}@example.com`,
      passwordHash: "hashed-password"
    }
  });

  createdUserIds.add(user.id);
  return user;
}

afterEach(async () => {
  const userIds = [...createdUserIds];
  if (userIds.length === 0) {
    return;
  }

  await prisma.emailTransactionImport.deleteMany({
    where: {
      userId: {
        in: userIds
      }
    }
  });
  await prisma.emailConnection.deleteMany({
    where: {
      userId: {
        in: userIds
      }
    }
  });
  await prisma.transaction.deleteMany({
    where: {
      userId: {
        in: userIds
      }
    }
  });
  await prisma.category.deleteMany({
    where: {
      userId: {
        in: userIds
      }
    }
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: userIds
      }
    }
  });
  createdUserIds.clear();
});

describe("email import service", () => {
  it("tidak menyimpan hasil sync otomatis dari email non-resmi walaupun ada bank dan nominal", async () => {
    const user = await createTestUser("untrusted-auto-sync");

    const imported = await importEmailTransaction(user.id, {
      emailAddress: "utama@gmail.com",
      from: "LinkedIn <messages-noreply@linkedin.com>",
      subject: "BCA - buka, bangun portofolio bisnis nyata 2026",
      body:
        "Transaksi BCA berhasil untuk program premium sebesar Rp 2.750.000 pada 04 Jun 2026. Lihat tautan t.co/example.",
      messageId: "linkedin-false-positive",
      autoImport: true
    });

    expect(imported).toBeNull();
    await expect(
      prisma.emailTransactionImport.count({
        where: {
          userId: user.id
        }
      })
    ).resolves.toBe(0);
    await expect(
      prisma.transaction.count({
        where: {
          userId: user.id
        }
      })
    ).resolves.toBe(0);
  });

  it("mencatat otomatis transaksi lengkap dari pengirim resmi", async () => {
    const user = await createTestUser("trusted-auto-sync");

    const imported = await importEmailTransaction(user.id, {
      emailAddress: "utama@gmail.com",
      from: "notifikasi@bca.co.id",
      subject: "Transfer masuk BCA berhasil",
      body:
        "BCA memberitahukan transfer masuk sebesar Rp 350.000 pada 01 Jun 2026 19:30 dari RISARU. Ref: BCA123456",
      messageId: "bca-valid-transaction",
      autoImport: true
    });

    expect(imported?.status).toBe("imported");
    expect(imported?.financialProvider).toBe("BCA");
    expect(imported?.amount).toBe("350000");
    await expect(
      prisma.transaction.count({
        where: {
          userId: user.id
        }
      })
    ).resolves.toBe(1);
  });
});
