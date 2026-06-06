import { apiRequest } from "../../lib/api-client";
import type {
  AccountTransfer,
  CreateAccountInput,
  CreateAccountTransferInput,
  FinanceAccount,
  UpdateAccountInput
} from "./account.types";

export function getAccounts() {
  return apiRequest<FinanceAccount[]>("/api/accounts");
}

export function createAccount(input: CreateAccountInput) {
  return apiRequest<FinanceAccount>("/api/accounts", {
    method: "POST",
    body: input
  });
}

export function updateAccount(accountId: string, input: UpdateAccountInput) {
  return apiRequest<FinanceAccount>(`/api/accounts/${accountId}`, {
    method: "PUT",
    body: input
  });
}

export function createAccountTransfer(input: CreateAccountTransferInput) {
  return apiRequest<AccountTransfer>("/api/accounts/transfers", {
    method: "POST",
    body: input
  });
}

export function getAccountTransfers() {
  return apiRequest<AccountTransfer[]>("/api/accounts/transfers");
}
