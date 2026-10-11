import type { RawField } from "../types";

export type Bounds = { min: number; max: number };

const optionalNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const parseBounds = (raw: RawField): Bounds | string => {
  const min = optionalNumber(raw.min, 0);
  const max = optionalNumber(raw.max, Infinity);

  return min <= max ? { min, max } : `min (${min}) is greater than max (${max})`;
};

export const toNumber = (data: unknown): number | null =>
  typeof data === "number" && Number.isFinite(data) ? data : null;

const formatBound = (bound: number) => (Number.isFinite(bound) ? bound.toLocaleString() : "∞");

export const validateRange = (value: number, { min, max }: Bounds) =>
  value < min || value > max ? `Must be between ${formatBound(min)} and ${formatBound(max)}` : undefined;
