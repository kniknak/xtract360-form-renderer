import { equals } from "ramda";
import { evaluate, isCondition } from "./conditions";
import { fieldRegistry } from "./fields/registry";
import { isRecord } from "./guards";
import { getAt, removeAt, setAt } from "./paths";
import type { BaseSpec, Incident, ParsedField, RawField } from "./types";

const parseBase = (raw: RawField, warn: (message: string) => void): BaseSpec | undefined => {
  if (typeof raw.path !== "string" || raw.path.trim() === "") {
    warn("missing path, skipped");
    return undefined;
  }

  const visibleWhen = isCondition(raw.visibleWhen) ? raw.visibleWhen : undefined;
  if (raw.visibleWhen !== undefined && !visibleWhen) warn("unsupported visibleWhen, ignored");

  return {
    label: typeof raw.label === "string" ? raw.label : raw.path,
    path: raw.path,
    required: raw.required === true,
    defaultValue: raw.defaultValue,
    visibleWhen,
  };
};

export const parseConfig = (config: unknown) => {
  const warnings: string[] = [];
  const fields: ParsedField[] = [];

  if (!Array.isArray(config)) {
    return { fields, warnings: ["Configuration must be a list of fields"] };
  }

  config.forEach((raw, index) => {
    const warn = (message: string) => warnings.push(`Field ${index + 1}: ${message}`);

    if (!isRecord(raw)) return warn("not an object, skipped");

    const type = raw.type;
    if (typeof type !== "string") return warn("unsupported type, skipped");

    if (!Object.hasOwn(fieldRegistry, type)) return warn(`unsupported type "${type}", skipped`);

    const definition = fieldRegistry[type];

    const base = parseBase(raw, warn);
    if (!base) return;

    const spec = definition.parse(raw, base, warn);
    if (spec) fields.push({ id: `field-${index}`, spec, definition });
  });

  return { fields, warnings };
};

export const readValue = ({ spec, definition }: ParsedField, data: unknown) =>
  definition.toValue(getAt(data, spec.path), spec);

export const buildDraft = (fields: ParsedField[], incident: Incident): Incident =>
  fields.reduce((draft, { spec, definition }) => {
    if (getAt(draft, spec.path) !== undefined || spec.defaultValue === undefined) return draft;

    const value = definition.toValue(spec.defaultValue, spec);
    return definition.isEmpty(value) ? draft : setAt(draft, spec.path, value);
  }, incident);

const hiddenPaths = (fields: ParsedField[], visible: ParsedField[]) =>
  [
    ...new Set(fields.filter((field) => !visible.includes(field)).map((field) => field.spec.path)),
  ].filter((path) => !visible.some((field) => field.spec.path === path));

const canHold = (data: unknown, path: string) => {
  const parent = path.split(".").slice(0, -1).join(".");
  const container = parent === "" ? data : getAt(data, parent);

  return typeof container === "object" && container !== null;
};

const replaceHidden = (
  fields: ParsedField[],
  visible: ParsedField[],
  data: Incident,
  replace: (data: Incident, path: string) => Incident,
): Incident =>
  hiddenPaths(fields, visible).reduce((result, path) => {
    if (!canHold(result, path)) return result;

    const kept = visible.filter((field) => field.spec.path.startsWith(`${path}.`));

    return kept.reduce(
      (next, field) =>
        getAt(result, field.spec.path) === undefined
          ? next
          : setAt(next, field.spec.path, getAt(result, field.spec.path)),
      replace(result, path),
    );
  }, data);

export const visibleFields = (fields: ParsedField[], draft: Incident): ParsedField[] => {
  let previous = fields;
  let visible = fields;

  for (let pass = 0; pass <= fields.length; pass++) {
    const data = replaceHidden(fields, visible, draft, removeAt);
    const next = fields.filter(({ spec }) => !spec.visibleWhen || evaluate(spec.visibleWhen, data));

    if (next.length === visible.length && next.every((field, index) => field === visible[index])) {
      return next;
    }
    previous = visible;
    visible = next;
  }

  return visible.filter((field) => previous.includes(field));
};

const fieldError = (field: ParsedField, draft: Incident) => {
  const { spec, definition } = field;
  const value = readValue(field, draft);

  if (definition.isEmpty(value)) return spec.required ? "Required" : undefined;
  return definition.validate?.(value, spec);
};

export const validateFields = (fields: ParsedField[], draft: Incident) => {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const error = fieldError(field, draft);
    if (error) errors[field.id] = error;
  }

  return errors;
};

const submittableDraft = (fields: ParsedField[], draft: Incident, incident: Incident) => {
  const visible = visibleFields(fields, draft);

  return {
    visible,
    draft: replaceHidden(fields, visible, draft, (result, path) => {
      const original = getAt(incident, path);

      return original === undefined ? removeAt(result, path) : setAt(result, path, original);
    }),
  };
};

const changedPathsIn = (visible: ParsedField[], draft: Incident, incident: Incident) =>
  [...new Set(visible.map((field) => field.spec.path))].filter(
    (path) => !equals(getAt(draft, path), getAt(incident, path)),
  );

export const changedPaths = (fields: ParsedField[], draft: Incident, incident: Incident) => {
  const submittable = submittableDraft(fields, draft, incident);

  return changedPathsIn(submittable.visible, submittable.draft, incident);
};

export const applySubmission = (fields: ParsedField[], draft: Incident, incident: Incident) => {
  const { visible, draft: cleanDraft } = submittableDraft(fields, draft, incident);

  return changedPathsIn(visible, cleanDraft, incident).reduce((result, path) => {
    const cleared = visible
      .filter((field) => field.spec.path === path)
      .every((field) => field.definition.isEmpty(readValue(field, cleanDraft)));

    return cleared ? removeAt(result, path) : setAt(result, path, getAt(cleanDraft, path));
  }, incident);
};
