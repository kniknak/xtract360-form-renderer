import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { BaseSpec, FieldDefinition } from "../types";
import { stringList } from "./enumInput";
import NumberInput from "./NumberInput";
import { type Bounds, boundsConflict, parseBounds, toNumber, validateRange } from "./numbers";

export type CurrencySpec = BaseSpec & Bounds & { type: "currencyInput"; currencies: string[] };
export type CurrencyValue = Record<string, unknown> & { currency: string; value: number | null };

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === "object" && data !== null;

export const currencyInput: FieldDefinition<CurrencySpec, CurrencyValue> = {
  parse: (raw, base) => {
    const currencies = stringList(raw.currencies);
    return currencies.length > 0
      ? { ...base, ...parseBounds(raw), type: "currencyInput", currencies }
      : "no valid currencies";
  },
  toValue: (data, spec) => {
    if (!isRecord(data)) return { currency: "", value: null };

    const currency = typeof data.currency === "string" && spec.currencies.includes(data.currency) ? data.currency : "";
    return { ...data, currency, value: toNumber(data.value) };
  },
  isEmpty: ({ currency, value }) => currency === "" && value === null,
  validate: ({ currency, value }, spec) => {
    if (currency === "") return "Select a currency";
    if (value === null) return "Enter an amount";
    return validateRange(value, spec);
  },
  lint: boundsConflict,
  Component: ({ id, spec, value, error, onChange }) => (
    <Stack direction="row" spacing={1}>
      <TextField
        select
        label="Currency"
        required={spec.required}
        value={value.currency}
        error={Boolean(error) && value.currency === ""}
        onChange={(event) => onChange({ ...value, currency: event.target.value })}
        sx={{ minWidth: 120 }}
      >
        {spec.currencies.map((currency) => (
          <MenuItem key={currency} value={currency}>
            {currency}
          </MenuItem>
        ))}
      </TextField>
      <NumberInput
        id={id}
        fullWidth
        label={spec.label}
        required={spec.required}
        value={value.value}
        decimals={2}
        error={Boolean(error)}
        helperText={error}
        onChange={(amount) => onChange({ ...value, value: amount })}
      />
    </Stack>
  ),
};
