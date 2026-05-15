import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../utils/http-error.js";
import type {
  CreateGoalInput,
  GoalResponse,
  UpdateGoalInput
} from "./goal.types.js";

type GoalEntity = Prisma.GoalGetPayload<object>;

function toDecimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

function decimalToString(value: Prisma.Decimal) {
  return value.toFixed(2);
}

function calculateProgressPercentage(
  currentAmount: Prisma.Decimal,
  targetAmount: Prisma.Decimal
) {
  if (targetAmount.lessThanOrEqualTo(0)) {
    return 0;
  }

  const percentage = currentAmount.dividedBy(targetAmount).times(100);
  const clampedPercentage = Prisma.Decimal.min(percentage, toDecimal(100));

  return Number(clampedPercentage.toFixed(2));
}

function mapGoalToResponse(goal: GoalEntity): GoalResponse {
  const targetAmount = toDecimal(goal.targetAmount);
  const currentAmount = toDecimal(goal.currentAmount);
  const remainingAmount = Prisma.Decimal.max(
    targetAmount.minus(currentAmount),
    toDecimal(0)
  );

  const progressPercentage = calculateProgressPercentage(
    currentAmount,
    targetAmount
  );

  const isCompleted = currentAmount.greaterThanOrEqualTo(targetAmount);

  const now = new Date();
  const isOverdue = Boolean(
    goal.deadline && goal.deadline < now && !isCompleted
  );

  return {
    id: goal.id,
    name: goal.name,
    targetAmount: decimalToString(targetAmount),
    currentAmount: decimalToString(currentAmount),
    progressPercentage,
    remainingAmount: decimalToString(remainingAmount),
    isCompleted,
    deadline: goal.deadline ? goal.deadline.toISOString() : null,
    isOverdue,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString()
  };
}

async function getOwnedGoalOrThrow(userId: string, goalId: string) {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId
    }
  });

  if (!goal) {
    throw new HttpError("Goal tidak ditemukan", 404);
  }

  return goal;
}

export async function createGoal(
  userId: string,
  input: CreateGoalInput
): Promise<GoalResponse> {
  const targetAmount = toDecimal(input.targetAmount);
  const currentAmount = toDecimal(input.currentAmount ?? 0);

  if (currentAmount.greaterThan(targetAmount)) {
    throw new HttpError(
      "Current amount tidak boleh lebih besar dari target amount",
      400
    );
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      name: input.name,
      targetAmount,
      currentAmount,
      deadline: input.deadline ?? null
    }
  });

  return mapGoalToResponse(goal);
}

export async function getGoals(userId: string): Promise<GoalResponse[]> {
  const goals = await prisma.goal.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return goals.map(mapGoalToResponse);
}

export async function getGoalById(
  userId: string,
  goalId: string
): Promise<GoalResponse> {
  const goal = await getOwnedGoalOrThrow(userId, goalId);

  return mapGoalToResponse(goal);
}

export async function updateGoal(
  userId: string,
  goalId: string,
  input: UpdateGoalInput
): Promise<GoalResponse> {
  const existingGoal = await getOwnedGoalOrThrow(userId, goalId);

  const targetAmount = input.targetAmount
    ? toDecimal(input.targetAmount)
    : toDecimal(existingGoal.targetAmount);

  const currentAmount =
    input.currentAmount !== undefined
      ? toDecimal(input.currentAmount)
      : toDecimal(existingGoal.currentAmount);

  if (currentAmount.greaterThan(targetAmount)) {
    throw new HttpError(
      "Current amount tidak boleh lebih besar dari target amount",
      400
    );
  }

  const goal = await prisma.goal.update({
    where: {
      id: existingGoal.id
    },
    data: {
      name: input.name ?? existingGoal.name,
      targetAmount,
      currentAmount,
      deadline:
        input.deadline !== undefined ? input.deadline : existingGoal.deadline
    }
  });

  return mapGoalToResponse(goal);
}

export async function deleteGoal(
  userId: string,
  goalId: string
): Promise<GoalResponse> {
  const existingGoal = await getOwnedGoalOrThrow(userId, goalId);

  const deletedGoal = await prisma.goal.delete({
    where: {
      id: existingGoal.id
    }
  });

  return mapGoalToResponse(deletedGoal);
}