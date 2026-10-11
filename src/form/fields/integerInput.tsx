import type { BaseSpec, FieldDefinition } from "../types";
import NumberInput from "./NumberInput";
import { type Bounds, boundsConflict, parseBounds, toNumber, validateRange } from "./numbers";

export type IntegerSpec = BaseSpec & Bounds & { type: "integerInput" };

export const integerInput: FieldDefinition<IntegerSpec, number | null> = {
  parse: (raw, base) => ({ ...base, ...parseBounds(raw), type: "integerInput" }),
  toValue: toNumber,
  isEmpty: (value) => value === null,
  validate: (value, spec) => {
    if (value === null) return undefined;
    return Number.isInteger(value) ? validateRange(value, spec) : "Must be a whole number";
  },
  lint: boundsConflict,
  Component: ({ id, spec, value, error, onChange }) => (
    <NumberInput
      id={id}
      fullWidth
      label={spec.label}
      required={spec.required}
      value={value}
      decimals={0}
      error={Boolean(error)}
      helperText={error}
      onChange={onChange}
    />
  ),
};
