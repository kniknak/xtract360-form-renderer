import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { stringList } from "../guards";
import type { BaseSpec, FieldDefinition } from "../types";

type EnumSpec = BaseSpec & { type: "enumInput"; values: string[] };

export const enumInput: FieldDefinition<EnumSpec, string> = {
  parse: (raw, base, warn) => {
    const values = stringList(raw.values);
    if (values.length === 0) {
      warn("no valid values, skipped");
      return undefined;
    }

    return { ...base, type: "enumInput", values };
  },
  toValue: (data, spec) => (typeof data === "string" && spec.values.includes(data) ? data : ""),
  isEmpty: (value) => value === "",
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
