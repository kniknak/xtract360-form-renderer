import { equals } from "ramda";
import { parseCondition, evaluate } from "./conditions";
import { fieldRegistry } from "./fields/registry";
import { getAt, removeAt, setAt } from "./paths";
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

    const problem = definition.lint?.(spec);
    if (problem) warn(problem);

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

const withoutHiddenValues = (fields: ParsedField[], visible: ParsedField[], draft: Incident) => {
  const visiblePaths = new Set(visible.map((field) => field.spec.path));

  return fields
    .filter((field) => !visiblePaths.has(field.spec.path))
    .reduce((data, field) => removeAt(data, field.spec.path), draft);
};

export const visibleFields = (fields: ParsedField[], draft: Incident): ParsedField[] => {
  const visible = fields.filter((field) => isVisible(field, draft));
  if (visible.length === fields.length) return visible;

  const data = withoutHiddenValues(fields, visible, draft);
  const stillVisible = visible.filter((field) => isVisible(field, data));

  return stillVisible.length === visible.length ? visible : visibleFields(visible, data);
};

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

const changedFields = (fields: ParsedField[], draft: Incident, incident: Incident) =>
  fields.filter((field) => !equals(readValue(field, draft), readValue(field, incident)));

export const changedPaths = (fields: ParsedField[], draft: Incident, incident: Incident) =>
  changedFields(fields, draft, incident).map((field) => field.spec.path);

export const applySubmission = (fields: ParsedField[], draft: Incident, incident: Incident): Incident =>
  changedFields(fields, draft, incident).reduce((result, field) => {
    const value = readValue(field, draft);
    const { path } = field.spec;

    return field.definition.isEmpty(value) ? removeAt(result, path) : setAt(result, path, value);
  }, incident);
