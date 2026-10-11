import type { RawField } from "../../types";

export type Bounds = { min: number; max: number };

const isBound = (value: unknown) => typeof value === "number" && Number.isFinite(value);

export const parseBounds = (
  { min, max }: RawField,
  warn: (message: string) => void,
): Bounds | undefined => {
  if (min !== undefined && !isBound(min)) {
    warn("invalid min, skipped");
    return undefined;
  }
  if (max !== undefined && !isBound(max)) {
    warn("invalid max, skipped");
    return undefined;
  }

  const bounds = {
    min: typeof min === "number" ? min : 0,
    max: typeof max === "number" ? max : Infinity,
  };
  if (bounds.min > bounds.max) {
    warn(`min (${bounds.min}) is greater than max (${bounds.max}), no value can be valid`);
  }

  return bounds;
};

export const toNumber = (data: unknown): number | null =>
  typeof data === "number" && Number.isFinite(data) ? data : null;

const formatBound = (bound: number) => (Number.isFinite(bound) ? bound.toLocaleString() : "∞");

export const validateRange = (value: number, { min, max }: Bounds) =>
  value < min || value > max
    ? `Must be between ${formatBound(min)} and ${formatBound(max)}`
    : undefined;
