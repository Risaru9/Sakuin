// Nominal fields use Indonesian notation: dots group thousands, a comma starts cents.

/** Reformats whatever was typed into "18.000" or "1.250,5". */
export function formatAmountInput(raw: string) {
  const [integerRaw = "", ...decimalParts] = raw.split(",");
  const integerDigits = integerRaw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const grouped = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (decimalParts.length === 0) {
    return grouped;
  }

  const decimals = decimalParts.join("").replace(/\D/g, "").slice(0, 2);

  return `${grouped || "0"},${decimals}`;
}

/** Returns the positive amount a formatted field holds, or null when it is not usable. */
export function parseAmountInput(text: string) {
  const normalized = text.trim().replace(/\./g, "").replace(",", ".");

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);

  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Turns a stored amount such as "18000.00" into field text ("18.000"). */
export function amountToInput(amount: string | number) {
  const [integerPart, decimalPart = "00"] = Number(amount).toFixed(2).split(".");
  const decimals = decimalPart.replace(/0+$/, "");

  return formatAmountInput(decimals ? `${integerPart},${decimals}` : integerPart);
}
