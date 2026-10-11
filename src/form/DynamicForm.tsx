import { useState } from "react";
import type { FocusEvent, FormEvent } from "react";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import {
  applySubmission,
  buildDraft,
  changedPaths,
  readValue,
  validateFields,
  visibleFields,
} from "./engine";
import { setAt } from "./paths";
import type { Incident, ParsedField } from "./types";

type DynamicFormProps = {
  fields: ParsedField[];
  incident: Incident;
  onSubmit: (incident: Incident, changed: string[]) => void;
};

const isFocusStillWithin = (event: FocusEvent<HTMLElement>) => {
  const next = event.relatedTarget;
  return Boolean(
    next && (event.currentTarget.contains(next) || next.closest('[role="presentation"]')),
  );
};

const DynamicForm = ({ fields, incident, onSubmit }: DynamicFormProps) => {
  const [draft, setDraft] = useState(() => buildDraft(fields, incident));
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  const visible = visibleFields(fields, draft);
  const errors = validateFields(visible, draft);
  const shownError = (id: string) => (attempted || touched.has(id) ? errors[id] : undefined);

  const handleBlur = (id: string) => (event: FocusEvent<HTMLElement>) => {
    if (!isFocusStillWithin(event)) setTouched((current) => new Set(current).add(id));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setAttempted(true);

    const firstInvalid = visible.find((field) => errors[field.id]);
    if (firstInvalid) {
      document.getElementById(firstInvalid.id)?.focus();
      return;
    }

    onSubmit(applySubmission(fields, draft, incident), changedPaths(fields, draft, incident));
  };

  return (
    <form noValidate onSubmit={handleSubmit}>
      {fields.map((field) => {
        const { id, spec, definition } = field;
        const { Component } = definition;

        return (
          <Collapse key={id} in={visible.includes(field)} unmountOnExit>
            <Stack pb={3} onBlur={handleBlur(id)}>
              <Component
                id={id}
                spec={spec}
                value={readValue(field, draft)}
                error={shownError(id)}
                onChange={(value: unknown) =>
                  setDraft((current) => setAt(current, spec.path, value))
                }
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
    </form>
  );
};

export default DynamicForm;
