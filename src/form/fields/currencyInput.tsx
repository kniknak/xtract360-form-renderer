import FormHelperText from "@mui/material/FormHelperText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { isRecord, stringList } from "../guards";
import type { BaseSpec, FieldDefinition } from "../types";
import NumberInput from "./shared/NumberInput";
import type { Bounds } from "./shared/numbers";
import { boundsConflict, parseBounds, toNumber, validateRange } from "./shared/numbers";

type CurrencySpec = BaseSpec & Bounds & { type: "currencyInput"; currencies: string[] };
type Money = Record<string, unknown> & { currency: string; value: number | null };

const hasValidPrecision = (value: number) => /^-?\d+(\.\d{1,2})?$/.test(String(value));

export const currencyInput: FieldDefinition<CurrencySpec, Money> = {
  parse: (raw, base) => {
    const bounds = parseBounds(raw);
    if (typeof bounds === "string") return bounds;

    const currencies = stringList(raw.currencies);
    return currencies.length > 0
      ? { ...base, ...bounds, type: "currencyInput", currencies }
      : "no valid currencies";
  },
  toValue: (data, spec) => {
    const money = isRecord(data) ? data : {};
    const { currency } = money;
    const known = typeof currency === "string" && spec.currencies.includes(currency);

    return { ...money, currency: known ? currency : "", value: toNumber(money.value) };
  },
  isEmpty: ({ currency, value }) => currency === "" && value === null,
  validate: ({ currency, value }, spec) => {
    if (currency === "") return "Currency is required";
    if (value === null) return "Amount is required";
    if (!hasValidPrecision(value)) return "At most 2 decimal places";
    return validateRange(value, spec);
  },
  lint: boundsConflict,
  Component: ({ id, spec, value: money, error, onChange }) => {
    const currencyMissing = money.currency === "";

    return (
      <Stack>
        <Stack direction="row" spacing={1}>
          <TextField
            select
            label="Currency"
            value={money.currency}
            error={Boolean(error) && currencyMissing}
            onChange={(event) => onChange({ ...money, currency: event.target.value })}
            sx={{ minWidth: 120 }}
          >
            {!spec.required && (
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
            )}
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
            value={money.value}
            decimals={2}
            error={Boolean(error) && !currencyMissing}
            onChange={(amount) => onChange({ ...money, value: amount })}
          />
        </Stack>
        {error && (
          <FormHelperText error sx={{ mx: 1.75 }}>
            {error}
          </FormHelperText>
        )}
      </Stack>
    );
  },
};
