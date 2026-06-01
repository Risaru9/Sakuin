import { describe, expect, it } from "vitest";
import { ApiClientError } from "../../lib/api-client";
import type { AiChatMessage, AiTransactionDraft } from "./ai.types";
import {
  buildRecentHistory,
  createAssistantMessage,
  createDraftKey,
  createWelcomeMessage,
  findLatestActiveDraftGroup,
  formatDraftAmount,
  getDraftAmountTotal,
  getSavableDraftEntries,
  getErrorMessage,
  isCancelDraftRequest,
  isDraftActionSuggestion,
  isTransactionDraftReadyToSave,
  isValidStoredMessages,
  isValidStringArray
} from "./ai-chat-utils";

const readyDraft: AiTransactionDraft = {
  type: "EXPENSE",
  amount: "25000",
  categoryId: "cat-food",
  categoryName: "Makan",
  note: "Bakso",
  date: "2026-06-01",
  confidence: "high",
  missingFields: [],
  warnings: []
};

function createAssistantDraftMessage(
  id: string,
  drafts: AiTransactionDraft[] = [readyDraft]
): AiChatMessage {
  return {
    id,
    role: "assistant",
    content: "Saya siapkan draft transaksi.",
    transactionDrafts: drafts,
    createdAt: "2026-06-01T00:00:00.000Z"
  };
}

describe("ai-chat-utils", () => {
  it("membuat pesan welcome dan assistant tanpa mengubah kontrak chat", () => {
    const welcomeMessage = createWelcomeMessage();
    const assistantMessage = createAssistantMessage({
      reply: "Ringkasan siap.",
      intent: "FINANCIAL_SUMMARY",
      cards: [{ label: "Status", value: "Aman" }],
      suggestions: ["Cek pengeluaran"]
    });

    expect(welcomeMessage.id).toBe("welcome-message");
    expect(welcomeMessage.role).toBe("assistant");
    expect(welcomeMessage.suggestions?.length).toBeGreaterThan(0);
    expect(assistantMessage.content).toBe("Ringkasan siap.");
    expect(assistantMessage.intent).toBe("FINANCIAL_SUMMARY");
  });

  it("memvalidasi draft transaksi yang siap dan yang belum lengkap", () => {
    expect(isTransactionDraftReadyToSave(readyDraft)).toBe(true);
    expect(
      isTransactionDraftReadyToSave({
        ...readyDraft,
        amount: "0"
      })
    ).toBe(false);
    expect(
      isTransactionDraftReadyToSave({
        ...readyDraft,
        categoryId: null,
        missingFields: ["categoryId"]
      })
    ).toBe(false);
  });

  it("mengambil draft yang masih bisa disimpan dan menghitung totalnya", () => {
    const message = createAssistantDraftMessage("message-1", [
      readyDraft,
      { ...readyDraft, amount: "10000", categoryId: null }
    ]);

    expect(
      getSavableDraftEntries(message, new Set(), new Set(), new Set())
    ).toHaveLength(1);
    expect(
      getSavableDraftEntries(
        message,
        new Set([createDraftKey("message-1", 0)]),
        new Set(),
        new Set()
      )
    ).toHaveLength(0);
    expect(getDraftAmountTotal(message.transactionDrafts ?? [])).toBe(35000);
  });

  it("menemukan grup draft aktif terbaru tanpa mengambil draft tersimpan", () => {
    const oldMessage = createAssistantDraftMessage("old");
    const newMessage = createAssistantDraftMessage("new");

    expect(
      findLatestActiveDraftGroup(
        [oldMessage, newMessage],
        new Set([createDraftKey("new", 0)]),
        new Set()
      )?.message.id
    ).toBe("old");
  });

  it("membangun recent history dengan batas aman", () => {
    const longText = "a".repeat(1600);
    const history = buildRecentHistory([
      createWelcomeMessage(),
      {
        id: "user-1",
        role: "user",
        content: longText,
        createdAt: "2026-06-01T00:00:00.000Z"
      }
    ]);

    expect(history).toEqual([{ role: "user", content: "a".repeat(1500) }]);
  });

  it("mendeteksi aksi draft dan permintaan batal yang tidak boleh dikirim sebagai prompt biasa", () => {
    expect(isDraftActionSuggestion("Simpan semua draft")).toBe(true);
    expect(isDraftActionSuggestion("Buat ringkasan")).toBe(false);
    expect(isCancelDraftRequest("tolong batalin")).toBe(true);
    expect(isCancelDraftRequest("bagaimana kondisi keuangan saya bulan ini?")).toBe(
      false
    );
  });

  it("memvalidasi payload tersimpan dan pesan error", () => {
    expect(isValidStoredMessages([createAssistantDraftMessage("stored")])).toBe(
      true
    );
    expect(isValidStoredMessages([{ id: "bad" }])).toBe(false);
    expect(isValidStringArray(["a", "b"])).toBe(true);
    expect(isValidStringArray(["a", 1])).toBe(false);
    expect(formatDraftAmount("25000").replace(/\s/g, "")).toBe("Rp25.000");
    expect(getErrorMessage(new ApiClientError("API gagal", 500))).toBe(
      "API gagal"
    );
    expect(getErrorMessage("unknown")).toBe(
      "Terjadi kesalahan saat menghubungi Asisten Sakuin."
    );
  });
});
