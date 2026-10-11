import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { BaseSpec, FieldDefinition } from "../types";

export type EnumSpec = BaseSpec & { type: "enumInput"; values: string[] };

export const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export const enumInput: FieldDefinition<EnumSpec, string> = {
  parse: (raw, base) => {
    const values = stringList(raw.values);
    return values.length > 0 ? { ...base, type: "enumInput", values } : "no valid values";
  },
  toValue: (data, spec) => (typeof data === "string" && spec.values.includes(data) ? data : ""),
  isEmpty: (value) => value === "",
  validate: () => undefined,
  Component: ({ id, spec, value, error, onChange }) => (
    <TextField
      id={id}
      select
      fullWidth
      label={spec.label}
      required={spec.required}
      value={value}
      error={Boolean(error)}
      helperText={error}
      onChange={(event) => onChange(event.target.value)}
    >
      {!spec.required && (
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
      )}
      {spec.values.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  ),
};
