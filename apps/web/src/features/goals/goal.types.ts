export type GoalHistory = {
  id: string;
  amount: string;
  currentAmount: string;
  createdAt: string;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string | null;
  description: string | null;
  history?: GoalHistory[];
  createdAt: string;
  updatedAt: string;
};

export type CreateGoalInput = {
  name: string;
  targetAmount: string;
  currentAmount?: string;
  deadline?: string | null;
  description?: string;
};

export type UpdateGoalInput = {
  name?: string;
  targetAmount?: string;
  currentAmount?: string;
  deadline?: string | null;
  description?: string;
};