# Design notes

## Approaches considered

| Option | For | Against |
|---|---|---|
| **Hand-rolled renderer + field registry** (chosen) | Small, readable, every behaviour visible in a few files; new types are additive | Validation/state handled by hand |
| `react-hook-form` / Formik with dynamic fields | Mature validation, field-level re-render performance | Library concepts dominate the code being reviewed; nested `path` → field-name mapping adds a layer |
| Translate config to JSON Schema and use RJSF | Validation, conditionals and widgets for free | Hides the renderer the exercise is about; theming/layout of the currency pair fights the library |

## Judgement calls

- **Precedence:** incident value → config `defaultValue` → empty. Data the customer already holds
  wins over a config default.
- **Currency amounts accept two decimals.** The spec calls it an integer input, but the sample
  incident stores `3554.5`; rejecting the existing data would block every submission.
- **Spec drift:** the sample config comment says `amount`, the data and spec use `value` — `value`
  is used.
- **Only changed fields write.** Submitting an untouched form returns the incident unchanged — no
  type coercion (`30` → `"30"`), no nulling of values a field cannot show, no sibling on a shared
  path clobbering another. Clearing a value writes `null`.
- **Hidden fields** are not validated and not written, even if the user filled them before the
  condition changed, and their values are ignored by other fields' conditions (a hidden "payload"
  cannot keep a "heavy load note" visible) unless a visible field shares the same path.
- **Fields sharing a path** (as in the sample config) are allowed; each coerces the shared value to
  its own type.
- **Conditions evaluate against the draft**, which starts as the incident, so "input data" and
  "elsewhere in the form" are one mechanism.

## Next steps / discussion points

- Field-level `visibleWhen` → section/page grouping (config is "a single page").
- Async/remote enum values, cross-field validation (e.g. `max` from another path).
- Per-field memoisation if forms grow to hundreds of fields (the whole form re-renders on change).
- Validating config at load time with a schema (zod) and surfacing it to config authors.
- Numeric path segments index arrays (`drivers.0.name`); repeating groups would need a new field type.
- Open edges: currency data keyed `amount` (as one spec comment says) is not read; extra keys on a
  currency object are dropped when edited; stored data that violates the config blocks saving
  until fixed (deliberately strict).
