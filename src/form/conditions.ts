import { equals } from "ramda";
import { isRecord } from "./guards";
import { getAt } from "./paths";

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { path: string; equals: unknown }
  | { path: string; in: unknown[] }
  | { path: string; gt: number }
  | { path: string; lt: number };

const isConditionList = (value: unknown) =>
  Array.isArray(value) && value.length > 0 && value.every(isCondition);

export const isCondition = (raw: unknown): raw is Condition => {
  if (!isRecord(raw)) return false;
  if ("all" in raw) return isConditionList(raw.all);
  if ("any" in raw) return isConditionList(raw.any);
  if ("not" in raw) return isCondition(raw.not);
  if (typeof raw.path !== "string" || raw.path === "") return false;

  return (
    "equals" in raw ||
    Array.isArray(raw.in) ||
    typeof raw.gt === "number" ||
    typeof raw.lt === "number"
  );
};

export const evaluate = (condition: Condition, data: unknown): boolean => {
  if ("all" in condition) return condition.all.every((c) => evaluate(c, data));
  if ("any" in condition) return condition.any.some((c) => evaluate(c, data));
  if ("not" in condition) return !evaluate(condition.not, data);

  const actual = getAt(data, condition.path);
  if ("equals" in condition) return equals(actual, condition.equals);
  if ("in" in condition) return condition.in.some((value) => equals(actual, value));
  if (typeof actual !== "number") return false;

  return "gt" in condition ? actual > condition.gt : actual < condition.lt;
};
