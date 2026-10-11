import type { ComponentType } from "react";
import type { Condition } from "./conditions";

export type Incident = Record<string, unknown>;
export type RawField = Record<string, unknown>;

export type BaseSpec = {
  label: string;
  path: string;
  required: boolean;
  defaultValue?: unknown;
  visibleWhen?: Condition;
};

export type FieldProps<S extends BaseSpec, V> = {
  id: string;
  spec: S;
  value: V;
  error?: string;
  onChange: (value: V) => void;
};

export type FieldDefinition<S extends BaseSpec, V> = {
  parse: (raw: RawField, base: BaseSpec) => S | string;
  toValue: (data: unknown, spec: S) => V;
  isEmpty: (value: V) => boolean;
  validate?: (value: V, spec: S) => string | undefined;
  lint?: (spec: S) => string | undefined;
  Component: ComponentType<FieldProps<S, V>>;
};

export type AnyFieldDefinition = FieldDefinition<any, any>;

export type ParsedField = {
  id: string;
  spec: BaseSpec;
  definition: AnyFieldDefinition;
};
