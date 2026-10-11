import { type FocusEvent, type FormEvent, useState } from "react";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import { applySubmission, buildDraft, changedPaths, validateFields, visibleFields } from "./engine";
import { getAt, setAt } from "./paths";
import type { Incident, ParsedField } from "./types";

type DynamicFormProps = {
  fields: ParsedField[];
  incident: Incident;
  onSubmit: (incident: Incident, changed: string[]) => void;
};

const DynamicForm = ({ fields, incident, onSubmit }: DynamicFormProps) => {
  const [draft, setDraft] = useState(() => buildDraft(fields, incident));
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  const visible = visibleFields(fields, draft);
  const errors = validateFields(visible, draft);
  const shownError = (key: string) => (attempted || touched.has(key) ? errors[key] : undefined);

  const handleBlur = (key: string) => (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget;
    const stillInside = next && (event.currentTarget.contains(next) || next.closest('[role="presentation"]'));
    if (!stillInside) setTouched((current) => new Set(current).add(key));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setAttempted(true);

    const firstInvalid = visible.find((field) => errors[field.key]);

    if (firstInvalid) {
      document.getElementById(firstInvalid.key)?.focus();
      return;
    }

    onSubmit(applySubmission(visible, draft, incident), changedPaths(visible, draft, incident));
  };

  return (
    <form noValidate onSubmit={handleSubmit}>
      <Stack spacing={0}>
        {fields.map((field) => {
          const { key, spec, definition } = field;
          const { Component } = definition;

          return (
            <Collapse key={key} in={visible.includes(field)} unmountOnExit>
              <Stack pb={3} onBlur={handleBlur(key)}>
                <Component
                  id={key}
                  spec={spec}
                  value={definition.toValue(getAt(draft, spec.path), spec)}
                  error={shownError(key)}
                  onChange={(value: unknown) => setDraft((current) => setAt(current, spec.path, value))}
                />
              </Stack>
            </Collapse>
          );
        })}
        <Stack direction="row" justifyContent="flex-end">
          <Button type="submit" variant="contained">
            Save changes
          </Button>
        </Stack>
      </Stack>
    </form>
  );
};

export default DynamicForm;
