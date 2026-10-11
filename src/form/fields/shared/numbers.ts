import type { RawField } from "../../types";

export type Bounds = { min: number; max: number };

const isBound = (value: unknown) => typeof value === "number" && Number.isFinite(value);

export const parseBounds = ({ min, max }: RawField): Bounds | string => {
  if (min !== undefined && !isBound(min)) return "invalid min";
  if (max !== undefined && !isBound(max)) return "invalid max";

  return {
    min: typeof min === "number" ? min : 0,
    max: typeof max === "number" ? max : Infinity,
  };
};

export const boundsConflict = ({ min, max }: Bounds) =>
  min > max ? `min (${min}) is greater than max (${max}), no value can be valid` : undefined;

export const toNumber = (data: unknown): number | null =>
  typeof data === "number" && Number.isFinite(data) ? data : null;

const formatBound = (bound: number) => (Number.isFinite(bound) ? bound.toLocaleString() : "∞");

export const validateRange = (value: number, { min, max }: Bounds) =>
  value < min || value > max
    ? `Must be between ${formatBound(min)} and ${formatBound(max)}`
    : undefined;
