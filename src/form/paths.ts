import { assocPath, path as ramdaPath } from "ramda";
import type { Incident } from "./types";

const segments = (path: string) => path.split(".");

export const getAt = (data: unknown, path: string): unknown =>
  ramdaPath(segments(path), data);

export const setAt = (data: Incident, path: string, value: unknown): Incident =>
  assocPath(segments(path), value, data);
