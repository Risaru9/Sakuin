import apiCopy from "../../../../api/src/modules/transactions/quick-transaction-parser.ts?raw";
import webCopy from "./quick-transaction-parser.ts?raw";

describe("quick transaction parser copies", () => {
  it("keeps the API copy identical to the web parser", () => {
    // The Android quick-entry window sends plain text; the API parses it with its own copy.
    expect(apiCopy.replace(/\r\n/g, "\n")).toBe(webCopy.replace(/\r\n/g, "\n"));
  });
});
