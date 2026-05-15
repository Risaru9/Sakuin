export type UserProfile = {
  id: string;
  name: string;
  email: string;
  safeBalanceLimit: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateUserProfileInput = {
  name: string;
  safeBalanceLimit: string;
};