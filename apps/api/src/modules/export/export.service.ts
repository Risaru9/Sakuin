import ExcelJS from "exceljs";
import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  ExportTransactionRow,
  ExportTransactionsData,
  ExportTransactionsQuery,
  ExportTransactionsSummary
} from "./export.types.js";

type TransactionWithCategory = Prisma.TransactionGetPayload<{
  include: {
    category: true;
  };
}>;

function toDecimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

function decimalToString(value: Prisma.Decimal) {
  return value.toFixed(2);
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function mapTransactionToExportRow(
  transaction: TransactionWithCategory
): ExportTransactionRow {
  return {
    id: transaction.id,
    date: transaction.date.toISOString(),
    type: transaction.type,
    amount: decimalToString(transaction.amount),
    note: transaction.note,
    category: {
      id: transaction.category.id,
      name: transaction.category.name,
      type: transaction.category.type,
      icon: transaction.category.icon,
      color: transaction.category.color
    },
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString()
  };
}

function buildWhereInput(
  userId: string,
  query: ExportTransactionsQuery
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {
    userId
  };

  if (query.type) {
    where.type = query.type as TransactionType;
  }

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  const dateFilter: Prisma.DateTimeFilter = {};

  if (query.startDate) {
    dateFilter.gte = startOfDay(query.startDate);
  }

  if (query.endDate) {
    dateFilter.lte = endOfDay(query.endDate);
  }

  if (Object.keys(dateFilter).length > 0) {
    where.date = dateFilter;
  }

  return where;
}

function calculateSummary(
  transactions: TransactionWithCategory[]
): ExportTransactionsSummary {
  let totalIncome = toDecimal(0);
  let totalExpense = toDecimal(0);

  for (const transaction of transactions) {
    if (transaction.type === TransactionType.INCOME) {
      totalIncome = totalIncome.plus(transaction.amount);
    }

    if (transaction.type === TransactionType.EXPENSE) {
      totalExpense = totalExpense.plus(transaction.amount);
    }
  }

  const balance = totalIncome.minus(totalExpense);

  return {
    totalIncome: decimalToString(totalIncome),
    totalExpense: decimalToString(totalExpense),
    balance: decimalToString(balance),
    transactionCount: transactions.length
  };
}

export async function getTransactionsExportData(
  userId: string,
  query: ExportTransactionsQuery
): Promise<ExportTransactionsData> {
  const transactions = await prisma.transaction.findMany({
    where: buildWhereInput(userId, query),
    include: {
      category: true
    },
    orderBy: {
      date: "desc"
    }
  });

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      type: query.type ?? null,
      categoryId: query.categoryId ?? null,
      startDate: query.startDate ? query.startDate.toISOString() : null,
      endDate: query.endDate ? query.endDate.toISOString() : null
    },
    summary: calculateSummary(transactions),
    transactions: transactions.map(mapTransactionToExportRow)
  };
}

function escapeSpreadsheetText(value: string) {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }

  return value;
}

function escapeCsvValue(value: string | number | null) {
  if (value === null) {
    return "";
  }

  const text = String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function buildTransactionsCsv(data: ExportTransactionsData) {
  const rows: Array<Array<string | number | null>> = [
    ["Sakuin Export Transaksi"],
    ["Generated At", data.generatedAt],
    ["Filter Type", data.filters.type],
    ["Filter Category ID", data.filters.categoryId],
    ["Filter Start Date", data.filters.startDate],
    ["Filter End Date", data.filters.endDate],
    [],
    ["Total Income", data.summary.totalIncome],
    ["Total Expense", data.summary.totalExpense],
    ["Balance", data.summary.balance],
    ["Transaction Count", data.summary.transactionCount],
    [],
    [
      "ID",
      "Tanggal",
      "Tipe",
      "Kategori ID",
      "Kategori",
      "Nominal",
      "Catatan",
      "Created At",
      "Updated At"
    ]
  ];

  for (const transaction of data.transactions) {
    rows.push([
      transaction.id,
      transaction.date,
      transaction.type,
      transaction.category.id,
      escapeSpreadsheetText(transaction.category.name),
      transaction.amount,
      transaction.note ? escapeSpreadsheetText(transaction.note) : null,
      transaction.createdAt,
      transaction.updatedAt
    ]);
  }

  const csv = rows
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");

  return `\uFEFF${csv}`;
}

export async function buildTransactionsXlsx(
  data: ExportTransactionsData
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Sakuin";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summarySheet = workbook.addWorksheet("Summary");

  summarySheet.columns = [
    {
      key: "label",
      width: 24
    },
    {
      key: "value",
      width: 32
    }
  ];

  summarySheet.mergeCells("A1:B1");
  summarySheet.getCell("A1").value = "Sakuin Export Transaksi";
  summarySheet.getCell("A1").font = {
    bold: true,
    size: 16
  };

  summarySheet.addRow([]);
  summarySheet.addRow(["Generated At", data.generatedAt]);
  summarySheet.addRow(["Filter Type", data.filters.type ?? "-"]);
  summarySheet.addRow(["Filter Category ID", data.filters.categoryId ?? "-"]);
  summarySheet.addRow(["Filter Start Date", data.filters.startDate ?? "-"]);
  summarySheet.addRow(["Filter End Date", data.filters.endDate ?? "-"]);
  summarySheet.addRow([]);
  summarySheet.addRow(["Total Income", Number(data.summary.totalIncome)]);
  summarySheet.addRow(["Total Expense", Number(data.summary.totalExpense)]);
  summarySheet.addRow(["Balance", Number(data.summary.balance)]);
  summarySheet.addRow(["Transaction Count", data.summary.transactionCount]);

  for (const row of summarySheet.getRows(3, 10) ?? []) {
    row.getCell(1).font = {
      bold: true
    };
  }

  summarySheet.getColumn(2).numFmt = "#,##0.00";

  const transactionSheet = workbook.addWorksheet("Transactions");

  transactionSheet.columns = [
    {
      header: "ID",
      key: "id",
      width: 28
    },
    {
      header: "Tanggal",
      key: "date",
      width: 24
    },
    {
      header: "Tipe",
      key: "type",
      width: 12
    },
    {
      header: "Kategori ID",
      key: "categoryId",
      width: 24
    },
    {
      header: "Kategori",
      key: "categoryName",
      width: 20
    },
    {
      header: "Nominal",
      key: "amount",
      width: 16
    },
    {
      header: "Catatan",
      key: "note",
      width: 32
    },
    {
      header: "Created At",
      key: "createdAt",
      width: 24
    },
    {
      header: "Updated At",
      key: "updatedAt",
      width: 24
    }
  ];

  transactionSheet.getRow(1).font = {
    bold: true
  };

  for (const transaction of data.transactions) {
    transactionSheet.addRow({
      id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      categoryId: transaction.category.id,
      categoryName: escapeSpreadsheetText(transaction.category.name),
      amount: Number(transaction.amount),
      note: transaction.note ? escapeSpreadsheetText(transaction.note) : "",
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    });
  }

  transactionSheet.getColumn("amount").numFmt = "#,##0.00";

  transactionSheet.views = [
    {
      state: "frozen",
      ySplit: 1
    }
  ];

  transactionSheet.autoFilter = {
    from: {
      row: 1,
      column: 1
    },
    to: {
      row: 1,
      column: 9
    }
  };

  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(buffer);
}
