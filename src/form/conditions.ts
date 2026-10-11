import { equals } from "ramda";
import { getAt } from "./paths";

export type Condition =
  | { op: "all"; conditions: Condition[] }
  | { op: "any"; conditions: Condition[] }
  | { op: "not"; condition: Condition }
  | { op: "equals"; path: string; value: unknown }
  | { op: "in"; path: string; values: unknown[] }
  | { op: "gt" | "lt"; path: string; value: number }
  | { op: "filled"; path: string; value: boolean };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseList = (raw: unknown): Condition[] | undefined => {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const conditions = raw.map(parseCondition);

  return conditions.every((condition) => condition !== undefined)
    ? (conditions as Condition[])
    : undefined;
};

export const parseCondition = (raw: unknown): Condition | undefined => {
  if (!isRecord(raw)) return undefined;

  if ("all" in raw) {
    const conditions = parseList(raw.all);
    return conditions && { op: "all", conditions };
  }

  if ("any" in raw) {
    const conditions = parseList(raw.any);
    return conditions && { op: "any", conditions };
  }

  if ("not" in raw) {
    const condition = parseCondition(raw.not);
    return condition && { op: "not", condition };
  }

  const { path } = raw;
  if (typeof path !== "string" || path === "") return undefined;

  if ("equals" in raw) return { op: "equals", path, value: raw.equals };
  if (Array.isArray(raw.in)) return { op: "in", path, values: raw.in };
  if (typeof raw.gt === "number") return { op: "gt", path, value: raw.gt };
  if (typeof raw.lt === "number") return { op: "lt", path, value: raw.lt };
  if (typeof raw.filled === "boolean") return { op: "filled", path, value: raw.filled };

  return undefined;
};

const isFilled = (value: unknown) => value !== undefined && value !== null && value !== "";

export const evaluate = (condition: Condition, data: unknown): boolean => {
  switch (condition.op) {
    case "all":
      return condition.conditions.every((c) => evaluate(c, data));
    case "any":
      return condition.conditions.some((c) => evaluate(c, data));
    case "not":
      return !evaluate(condition.condition, data);
    case "equals":
      return equals(getAt(data, condition.path), condition.value);
    case "in":
      return condition.values.some((value) => equals(getAt(data, condition.path), value));
    case "gt":
    case "lt": {
      const actual = getAt(data, condition.path);
      if (typeof actual !== "number") return false;
      return condition.op === "gt" ? actual > condition.value : actual < condition.value;
    }
    case "filled":
      return isFilled(getAt(data, condition.path)) === condition.value;
  }
};
