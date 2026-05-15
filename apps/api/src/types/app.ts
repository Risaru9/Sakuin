export type AppVariables = {
  userId?: string;
  validatedJson?: unknown;
  validatedQuery?: unknown;
  validatedParam?: unknown;
};

export type AppEnv = {
  Variables: AppVariables;
};