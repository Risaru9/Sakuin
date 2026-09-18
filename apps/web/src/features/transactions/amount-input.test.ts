import { amountToInput, formatAmountInput, parseAmountInput } from "./amount-input";

describe("amount input", () => {
  it("groups thousands while typing and keeps up to two decimals", () => {
    expect(formatAmountInput("18000")).toBe("18.000");
    expect(formatAmountInput("1.250.000")).toBe("1.250.000");
    expect(formatAmountInput("1250,567")).toBe("1.250,56");
    expect(formatAmountInput(",5")).toBe("0,5");
    expect(formatAmountInput("0018rb")).toBe("18");
    expect(formatAmountInput("")).toBe("");
  });

  it("reads the typed text back as a positive number", () => {
    expect(parseAmountInput("18.000")).toBe(18000);
    expect(parseAmountInput("1.250,5")).toBe(1250.5);
    expect(parseAmountInput("0")).toBeNull();
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
  });

  it("shows stored amounts without trailing zero cents", () => {
    expect(amountToInput("18000.00")).toBe("18.000");
    expect(amountToInput("1250.50")).toBe("1.250,5");
    expect(amountToInput(99.99)).toBe("99,99");
  });
});
