import type { BaseSpec, FieldDefinition } from "../types";
import NumberInput from "./shared/NumberInput";
import type { Bounds } from "./shared/numbers";
import { boundsConflict, parseBounds, toNumber, validateRange } from "./shared/numbers";

type IntegerSpec = BaseSpec & Bounds & { type: "integerInput" };

export const integerInput: FieldDefinition<IntegerSpec, number | null> = {
  parse: (raw, base) => {
    const bounds = parseBounds(raw);
    return typeof bounds === "string" ? bounds : { ...base, ...bounds, type: "integerInput" };
  },
  toValue: toNumber,
  isEmpty: (value) => value === null,
  validate: (value, spec) =>
    typeof value === "number" && Number.isInteger(value)
      ? validateRange(value, spec)
      : "Must be a whole number",
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
