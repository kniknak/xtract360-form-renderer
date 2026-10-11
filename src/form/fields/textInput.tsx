import TextField from "@mui/material/TextField";
import type { BaseSpec, FieldDefinition } from "../types";

type TextSpec = BaseSpec & { type: "textInput" };

export const textInput: FieldDefinition<TextSpec, string> = {
  parse: (_raw, base) => ({ ...base, type: "textInput" }),
  toValue: (data) => (typeof data === "string" || typeof data === "number" ? String(data) : ""),
  isEmpty: (value) => value.trim() === "",
  Component: ({ id, spec, value, error, onChange }) => (
    <TextField
      id={id}
      fullWidth
      label={spec.label}
      required={spec.required}
      value={value}
      error={Boolean(error)}
      helperText={error}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
};
