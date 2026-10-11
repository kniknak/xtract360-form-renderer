import { parseCondition, evaluate } from "./conditions";
import { fieldRegistry } from "./fields/registry";
import { getAt, setAt } from "./paths";
import type { BaseSpec, Incident, ParsedField, RawField } from "./types";

export type ParseResult = { fields: ParsedField[]; warnings: string[] };
export type Errors = Record<string, string>;

const isRecord = (value: unknown): value is RawField =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseBase = (raw: RawField, warn: (message: string) => void): BaseSpec | undefined => {
  if (typeof raw.path !== "string" || raw.path.trim() === "") {
    warn("missing path, skipped");
    return undefined;
  }

  const visibleWhen = parseCondition(raw.visibleWhen);
  if (raw.visibleWhen !== undefined && !visibleWhen) warn("unsupported visibleWhen ignored");

  return {
    type: String(raw.type),
    label: typeof raw.label === "string" ? raw.label : raw.path,
    path: raw.path,
    required: raw.required === true,
    defaultValue: raw.defaultValue,
    visibleWhen,
  };
};

export const parseConfig = (config: unknown): ParseResult => {
  if (!Array.isArray(config)) return { fields: [], warnings: ["Configuration must be a list of fields"] };

  const warnings: string[] = [];
  const fields: ParsedField[] = [];

  config.forEach((raw, index) => {
    const warn = (message: string) => warnings.push(`Field ${index + 1}: ${message}`);

    if (!isRecord(raw)) return warn("not an object, skipped");

    const definition = fieldRegistry[String(raw.type)];
    if (!definition) return warn(`unsupported type "${String(raw.type)}", skipped`);

    const base = parseBase(raw, warn);
    if (!base) return;

    const spec = definition.parse(raw, base);
    if (typeof spec === "string") return warn(`${spec}, skipped`);

    fields.push({ key: `field-${index}`, spec, definition });
  });

  return { fields, warnings };
};

const readValue = ({ spec, definition }: ParsedField, data: unknown) =>
  definition.toValue(getAt(data, spec.path), spec);

export const buildDraft = (fields: ParsedField[], incident: Incident): Incident =>
  fields.reduce((draft, field) => {
    const { spec, definition } = field;
    if (getAt(draft, spec.path) !== undefined || spec.defaultValue === undefined) return draft;

    const value = definition.toValue(spec.defaultValue, spec);
    return definition.isEmpty(value) ? draft : setAt(draft, spec.path, value);
  }, incident);

export const isVisible = ({ spec }: ParsedField, draft: Incident) =>
  !spec.visibleWhen || evaluate(spec.visibleWhen, draft);

export const visibleFields = (fields: ParsedField[], draft: Incident) =>
  fields.filter((field) => isVisible(field, draft));

export const validateFields = (fields: ParsedField[], draft: Incident): Errors =>
  Object.fromEntries(
    fields.flatMap((field) => {
      const value = readValue(field, draft);
      const empty = field.definition.isEmpty(value);
      const error = empty
        ? field.spec.required ? "This field is required" : undefined
        : field.definition.validate(value, field.spec);

      return error ? [[field.key, error]] : [];
    }),
  );

export const applySubmission = (fields: ParsedField[], draft: Incident, incident: Incident): Incident =>
  fields.reduce((result, field) => {
    const value = readValue(field, draft);

    if (!field.definition.isEmpty(value)) return setAt(result, field.spec.path, value);
    return getAt(incident, field.spec.path) === undefined ? result : setAt(result, field.spec.path, null);
  }, incident);
