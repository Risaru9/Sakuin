export function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

export function formatRupiah(value: string | number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

export function formatPercent(value: number | null) {
  if (value === null) {
    return "Belum bisa dibandingkan";
  }

  if (value > 0) {
    return `+${value}%`;
  }

  return `${value}%`;
}

export function formatRatio(value: number | null) {
  if (value === null) {
    return "Belum bisa dinilai";
  }

  return `${value}%`;
}

export function formatChangePercent(value: number | null) {
  if (value === null) {
    return "Baru / belum ada pembanding";
  }

  return formatPercent(value);
}

export function roundOneDecimal(value: number) {
  return Number(value.toFixed(1));
}

export function calculateExpenseRatio(input: {
  income: number;
  expense: number;
}) {
  if (input.income <= 0) {
    return null;
  }

  return roundOneDecimal((input.expense / input.income) * 100);
}
