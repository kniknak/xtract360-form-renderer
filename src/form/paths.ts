import { assocPath, dissocPath, path as ramdaPath } from "ramda";
import type { Incident } from "./types";

const segments = (path: string) =>
  path.split(".").map((key) => (/^\d+$/.test(key) ? Number(key) : key));

export const getAt = (data: unknown, path: string): unknown => ramdaPath(segments(path), data);

export const setAt = (data: Incident, path: string, value: unknown): Incident =>
  assocPath(segments(path), value, data);

export const removeAt = (data: Incident, path: string): Incident =>
  dissocPath(segments(path), data);
