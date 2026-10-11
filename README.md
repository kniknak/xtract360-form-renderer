# Dynamic Form Renderer

Renders an incident form from a JSON field configuration, pre-fills it from incident data and
writes the edited values back to the configured paths on submit.

```bash
npm install
npm run dev     # http://localhost:5173
npm test
```

The configuration picker switches between the provided configurations. **Edit configuration &
incident data** accepts any configuration (JSON with comments is fine) — paste a new one and press
**Apply**.

## Stages covered

| # | Stage | Where |
|---|---|---|
| 1 | Text fields in config order, writing to the incident | `fields/textInput.tsx`, `DynamicForm.tsx` |
| 2 | Defaults from the incident via the field `path` | `engine.ts` `buildDraft` |
| 3 | `integerInput` with `min` (default 0) / `max` (default ∞) | `fields/integerInput.tsx` |
| 4 | `enumInput` dropdown | `fields/enumInput.tsx` |
| 5 | `currencyInput`, stored as `{ currency, value }` | `fields/currencyInput.tsx` |
| 6 | `"required": true`, shown with an asterisk, enforced on submit | `engine.ts` `validateFields` |
| 7 | `"visibleWhen"` conditions over incident data and live form values | `conditions.ts` |

## How it works

```
config ──parseConfig──▶ ParsedField[] ──┐
                        (warnings)      ├─▶ DynamicForm ── draft ──submit──▶ applySubmission ──▶ output
incident ───────────────────────────────┘    (buildDraft)
```

- **Field registry** — each field type is one module exporting a `FieldDefinition`: `parse` the
  type-specific config, `toValue` to coerce stored data into the widget's value, `isEmpty`,
  `validate` and the `Component`. Adding a type means one file plus one registry line.
- **Draft** — the form edits a copy of the incident (with config `defaultValue`s filled in where
  the incident has nothing). Fields read and write it by path, so conditions see live values and
  incident values through the same lookup.
- **Submit** — validates only visible fields, then writes each visible field whose value changed
  to its path on the original incident. Untouched fields and hidden fields never write, so data a
  field cannot represent (a number under a text field, an enum value outside `values`) survives.

### Config extensions

```jsonc
{ "required": true }
{ "visibleWhen": { "path": "vehicle.type", "equals": "Van" } }
{ "visibleWhen": { "path": "vehicle.type", "in": ["Van", "Car"] } }
{ "visibleWhen": { "path": "vehicle.tradeValue.value", "gt": 3000 } }   // also "lt"
{ "visibleWhen": { "path": "driver.name", "filled": true } }
{ "visibleWhen": { "all": [ … ] } }   // also "any", "not"
```

### Graceful degradation

Unknown field types, missing paths, empty `values` / `currencies`, `min > max` and non-object
entries are skipped with a visible warning. Unknown properties are ignored. An unsupported
`visibleWhen` is dropped (field shown) with a warning. A default or stored value that does not fit
the field (e.g. an enum default not in `values`) is ignored rather than rendered.

See [docs/DESIGN.md](docs/DESIGN.md) for the options considered and the judgement calls.
