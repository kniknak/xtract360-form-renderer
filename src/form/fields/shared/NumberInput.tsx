import { useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";

type NumberInputProps = Omit<TextFieldProps, "value" | "onChange"> & {
  value: number | null;
  decimals: number;
  onChange: (value: number | null) => void;
};

const MAX_DIGITS = 15;

const toText = (value: number | null) => (value === null ? "" : String(value));

const parseText = (text: string) => {
  const parsed = Number(text);
  return text === "" || text === "-" || Number.isNaN(parsed) ? null : parsed;
};

const NumberInput = ({ value, decimals, onChange, ...props }: NumberInputProps) => {
  const [text, setText] = useState(toText(value));

  useEffect(() => {
    setText((current) => (parseText(current) === value ? current : toText(value)));
  }, [value]);

  const pattern = new RegExp(
    `^-?\\d{0,${MAX_DIGITS - decimals}}${decimals > 0 ? `(\\.\\d{0,${decimals}})?` : ""}$`,
  );

  const handleChange = (next: string) => {
    if (!pattern.test(next)) return;

    setText(next);
    onChange(parseText(next));
  };

  return (
    <TextField
      {...props}
      value={text}
      onChange={(event) => handleChange(event.target.value)}
      inputProps={{ inputMode: decimals > 0 ? "decimal" : "numeric" }}
    />
  );
};

export default NumberInput;
