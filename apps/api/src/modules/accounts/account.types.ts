import type { z } from "zod";
import type {
  accountIdParamSchema,
  createAccountSchema,
  createAccountTransferSchema,
  updateAccountSchema
} from "./account.schema.js";

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AccountIdParam = z.infer<typeof accountIdParamSchema>;
export type CreateAccountTransferInput = z.infer<
  typeof createAccountTransferSchema
>;
