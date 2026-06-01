import { describe, expect, it } from "vitest";
import {
  buildConversationHistoryText,
  classifyAiChatMessage
} from "../src/modules/ai/ai-chat-classifier.js";
import type { AiChatHistoryMessage } from "../src/modules/ai/ai.types.js";

describe("AI chat classifier", () => {
  it("membersihkan dan membatasi konteks history sebelum dipakai prompt", () => {
    const longContent = "a".repeat(1600);
    const history: AiChatHistoryMessage[] = [
      { role: "assistant", content: "   " },
      { role: "user", content: ` ${longContent} ` }
    ];

    const text = buildConversationHistoryText(history);

    expect(text).toContain("1. USER:");
    expect(text).toContain("a".repeat(1500));
    expect(text).not.toContain("a".repeat(1501));
  });

  it("menganggap pesan lanjutan sebagai follow-up intent finansial terakhir", () => {
    const result = classifyAiChatMessage("lanjutannya apa?", [
      {
        role: "user",
        content: "target tabungan saya masih realistis?"
      },
      {
        role: "assistant",
        content: "Mari kita cek targetnya."
      }
    ]);

    expect(result.intent).toBe("GOAL_ANALYSIS");
    expect(result.reason).toBe("contextual_continuation_follow_up");
  });

  it("tetap menolak pesan out-of-scope tanpa konteks finansial", () => {
    const result = classifyAiChatMessage("rekomendasi film dong", [
      {
        role: "assistant",
        content: "Halo, saya Asisten Sakuin."
      }
    ]);

    expect(result.intent).toBe("OUT_OF_SCOPE");
  });
});
