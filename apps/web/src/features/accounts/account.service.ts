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

/** Active accounts first, then the archived ones (which keep their history). */
export function getAccountsWithArchived() {
  return apiRequest<FinanceAccount[]>("/api/accounts?includeArchived=true");
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

export function archiveAccount(accountId: string) {
  return apiRequest<FinanceAccount>(`/api/accounts/${accountId}`, {
    method: "DELETE"
  });
}

export function restoreAccount(accountId: string) {
  return apiRequest<FinanceAccount>(`/api/accounts/${accountId}/restore`, {
    method: "POST"
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
