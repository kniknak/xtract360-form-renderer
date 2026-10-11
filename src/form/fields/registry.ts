import type { AnyFieldDefinition } from "../types";
import { currencyInput } from "./currencyInput";
import { enumInput } from "./enumInput";
import { integerInput } from "./integerInput";
import { textInput } from "./textInput";

export const fieldRegistry: Record<string, AnyFieldDefinition> = {
  textInput,
  integerInput,
  enumInput,
  currencyInput,
};
