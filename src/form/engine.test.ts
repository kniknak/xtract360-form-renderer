import configurationToImplement from "../data/configurationToImplement.json";
import incident from "../data/incident.json";
import {
  applySubmission,
  buildDraft,
  changedPaths,
  parseConfig,
  validateFields,
  visibleFields,
} from "./engine";
import type { Incident } from "./types";

const parse = (config: unknown[]) => parseConfig(config).fields;

describe("parseConfig", () => {
  it("keeps supported fields in config order", () => {
    const { fields, warnings } = parseConfig(configurationToImplement);

    expect(fields.map((f) => f.spec.label)).toEqual([
      "Driver Name",
      "Vehicle Regplate",
      "Vehicle Type",
      "Driver Age",
      "Vehicle Trade Value",
    ]);
    expect(warnings).toEqual([]);
  });

  it("discards unsupported or malformed fields with a warning", () => {
    const { fields, warnings } = parseConfig([
      { type: "dateInput", label: "Date", path: "a" },
      { type: "textInput", label: "No path" },
      { type: "enumInput", label: "Empty", path: "b", values: [] },
      "nonsense",
      { type: "textInput", label: "Kept", path: "d", unknownProp: true },
    ]);

    expect(fields.map((f) => f.spec.label)).toEqual(["Kept"]);
    expect(warnings).toHaveLength(4);
  });

  it("keeps a field with contradictory bounds and warns about it", () => {
    const { fields, warnings } = parseConfig([
      { type: "integerInput", label: "Age", path: "age", min: 100, max: 10 },
    ]);

    expect(fields).toHaveLength(1);
    expect(warnings).toEqual([
      "Field 1: min (100) is greater than max (10), no value can be valid",
    ]);
    expect(validateFields(fields, { age: 50 })).toEqual({
      "field-0": "Must be between 100 and 10",
    });
  });

  it("skips fields whose type is not a registered string, without throwing", () => {
    const { fields, warnings } = parseConfig([
      { type: "__proto__", label: "A", path: "a" },
      { type: "constructor", label: "B", path: "b" },
      { type: "toString", label: "C", path: "c" },
      { type: { toString: 5 }, label: "D", path: "d" },
    ]);

    expect(fields).toEqual([]);
    expect(warnings).toEqual([
      'Field 1: unsupported type "__proto__", skipped',
      'Field 2: unsupported type "constructor", skipped',
      'Field 3: unsupported type "toString", skipped',
      "Field 4: unsupported type, skipped",
    ]);
  });

  it("skips a numeric field whose bounds are not numbers", () => {
    const { fields, warnings } = parseConfig([
      { type: "integerInput", label: "Age", path: "age", min: "5" },
      { type: "currencyInput", label: "Price", path: "price", max: null, currencies: ["EUR"] },
    ]);

    expect(fields).toEqual([]);
    expect(warnings).toEqual(["Field 1: invalid min, skipped", "Field 2: invalid max, skipped"]);
  });

  it("applies integer defaults of min 0 and max infinity", () => {
    const [field] = parse([{ type: "integerInput", label: "Age", path: "age" }]);

    expect(field.spec).toMatchObject({ min: 0, max: Infinity });
  });

  it("drops an unsupported condition but keeps the field", () => {
    const { fields, warnings } = parseConfig([
      { type: "textInput", label: "Note", path: "note", visibleWhen: { path: "x", matches: ".*" } },
    ]);

    expect(fields[0].spec.visibleWhen).toBeUndefined();
    expect(warnings).toEqual(["Field 1: unsupported visibleWhen, ignored"]);
  });
});

describe("buildDraft", () => {
  it("prefers incident data over config defaults", () => {
    const fields = parse([
      { type: "textInput", label: "Reg", path: "vehicle.regplate", defaultValue: "ZZZ" },
      { type: "textInput", label: "Name", path: "driver.name", defaultValue: "Peter Nolan" },
    ]);

    expect(buildDraft(fields, incident)).toMatchObject({
      vehicle: { regplate: "ABC1234" },
      driver: { name: "Peter Nolan" },
    });
  });

  it("ignores defaults that are invalid for the field", () => {
    const fields = parse([
      { type: "enumInput", label: "Type", path: "type", values: ["Car"], defaultValue: "Boat" },
    ]);

    expect(buildDraft(fields, {})).toEqual({});
  });
});

describe("validateFields", () => {
  const fields = parse([
    { type: "textInput", label: "Name", path: "name", required: true },
    { type: "integerInput", label: "Age", path: "age", min: 18, max: 99 },
    { type: "currencyInput", label: "Value", path: "value", currencies: ["EUR"] },
  ]);

  it("flags missing required fields, out of range numbers and partial currency", () => {
    expect(
      validateFields(fields, { name: " ", age: 120, value: { currency: "", value: 10 } }),
    ).toEqual({
      "field-0": "Required",
      "field-1": "Must be between 18 and 99",
      "field-2": "Currency is required",
    });
  });

  it("rejects stored currency amounts with more than two decimals", () => {
    expect(
      validateFields(fields, { name: "Ann", value: { currency: "EUR", value: 3554.555 } }),
    ).toEqual({
      "field-2": "At most 2 decimal places",
    });
  });

  it("passes empty optional fields", () => {
    expect(validateFields(fields, { name: "Ann" })).toEqual({});
  });
});

describe("visibleFields", () => {
  const fields = parse([
    { type: "enumInput", label: "Type", path: "type", values: ["Car", "Van"] },
    {
      type: "integerInput",
      label: "Payload",
      path: "payload",
      visibleWhen: { path: "type", equals: "Van" },
    },
    {
      type: "textInput",
      label: "Note",
      path: "note",
      visibleWhen: {
        any: [{ path: "value.value", gt: 1000 }, { not: { path: "type", in: ["Car", "Van"] } }],
      },
    },
  ]);

  it.each([
    [{ type: "Van" }, ["Type", "Payload"]],
    [{ type: "Car" }, ["Type"]],
    [{ type: "Car", value: { value: 5000 } }, ["Type", "Note"]],
    [{}, ["Type", "Note"]],
  ])("for %j shows %j", (draft, labels) => {
    expect(visibleFields(fields, draft).map((f) => f.spec.label)).toEqual(labels);
  });

  describe("with dependent conditions", () => {
    const fields = parse([
      { type: "enumInput", label: "Type", path: "type", values: ["Car", "Van"] },
      {
        type: "integerInput",
        label: "Payload",
        path: "payload",
        visibleWhen: { path: "type", equals: "Van" },
      },
      {
        type: "textInput",
        label: "Heavy load note",
        path: "note",
        visibleWhen: { path: "payload", gt: 1000 },
      },
      {
        type: "textInput",
        label: "Shared",
        path: "payload",
        visibleWhen: { path: "type", equals: "Car" },
      },
    ]);

    it("ignores values of hidden fields when evaluating other conditions", () => {
      const labels = (draft: Incident) =>
        visibleFields(fields.slice(0, 3), draft).map((f) => f.spec.label);

      expect(labels({ type: "Van", payload: 2000 })).toEqual([
        "Type",
        "Payload",
        "Heavy load note",
      ]);
      expect(labels({ type: "Car", payload: 2000 })).toEqual(["Type"]);
    });

    it("shows a field whose condition only holds once a hidden field's value is ignored", () => {
      const negated = parse([
        { type: "enumInput", label: "Type", path: "type", values: ["Car", "Van"] },
        {
          type: "integerInput",
          label: "Payload",
          path: "payload",
          visibleWhen: { path: "type", equals: "Van" },
        },
        {
          type: "textInput",
          label: "No payload",
          path: "reason",
          visibleWhen: { not: { path: "payload", gt: 0 } },
        },
      ]);

      expect(
        visibleFields(negated, { type: "Car", payload: 500 }).map((f) => f.spec.label),
      ).toEqual(["Type", "No payload"]);
    });

    it("keeps a visible nested field's value when its hidden parent path is ignored", () => {
      const nested = parse([
        { type: "enumInput", label: "Mode", path: "mode", values: ["a", "b"] },
        {
          type: "textInput",
          label: "Vehicle",
          path: "vehicle",
          visibleWhen: { path: "mode", equals: "a" },
        },
        { type: "enumInput", label: "Vehicle type", path: "vehicle.type", values: ["Van"] },
        {
          type: "textInput",
          label: "Van note",
          path: "note",
          visibleWhen: { path: "vehicle.type", equals: "Van" },
        },
      ]);

      expect(
        visibleFields(nested, { mode: "b", vehicle: { type: "Van" } }).map((f) => f.spec.label),
      ).toEqual(["Mode", "Vehicle type", "Van note"]);
    });

    it("ignores a hidden field's value even when the dependent field comes first", () => {
      const forward = parse([
        {
          type: "textInput",
          label: "Heavy load note",
          path: "note",
          visibleWhen: { path: "payload", gt: 1000 },
        },
        { type: "enumInput", label: "Type", path: "type", values: ["Car", "Van"] },
        {
          type: "integerInput",
          label: "Payload",
          path: "payload",
          visibleWhen: { path: "type", equals: "Van" },
        },
      ]);

      expect(
        visibleFields(forward, { type: "Car", payload: 2000 }).map((f) => f.spec.label),
      ).toEqual(["Type"]);
    });

    it("ignores a value shared only by hidden fields", () => {
      const coSharers = parse([
        { type: "enumInput", label: "Type", path: "type", values: ["Car", "Van"] },
        { type: "textInput", label: "A", path: "x", visibleWhen: { path: "type", equals: "Van" } },
        { type: "textInput", label: "B", path: "x", visibleWhen: { path: "type", equals: "Van" } },
        {
          type: "textInput",
          label: "Secret note",
          path: "note",
          visibleWhen: { path: "x", equals: "secret" },
        },
      ]);

      expect(
        visibleFields(coSharers, { type: "Car", x: "secret" }).map((f) => f.spec.label),
      ).toEqual(["Type"]);
    });

    it("hides a hidden parent's values even when a child field stays visible", () => {
      const parentChild = parse([
        { type: "enumInput", label: "Type", path: "type", values: ["Car", "Van"] },
        {
          type: "currencyInput",
          label: "Price",
          path: "price",
          currencies: ["EUR"],
          visibleWhen: { path: "type", equals: "Van" },
        },
        { type: "textInput", label: "Memo", path: "price.memo" },
        {
          type: "textInput",
          label: "Pricey note",
          path: "note",
          visibleWhen: { path: "price.value", gt: 1 },
        },
      ]);

      expect(
        visibleFields(parentChild, {
          type: "Car",
          price: { currency: "EUR", value: 5, memo: "m" },
        }).map((f) => f.spec.label),
      ).toEqual(["Type", "Memo"]);
    });

    it("hides a field whose condition keeps flipping its own visibility", () => {
      const selfDependent = parse([
        { type: "textInput", label: "Name", path: "name" },
        { type: "textInput", label: "City", path: "city" },
        {
          type: "integerInput",
          label: "X",
          path: "x",
          visibleWhen: { not: { path: "x", equals: 1 } },
        },
      ]);
      const labels = (fields: typeof selfDependent, draft: Incident) =>
        visibleFields(fields, draft).map((f) => f.spec.label);

      expect(labels(selfDependent, { x: 1 })).toEqual(["Name", "City"]);
      expect(labels(selfDependent.slice(1), { x: 1 })).toEqual(["City"]);
      expect(labels(selfDependent, { x: 2 })).toEqual(["Name", "City", "X"]);
    });

    it("lets a visible field sharing a hidden field's path keep dependents visible", () => {
      expect(
        visibleFields(fields, { type: "Car", payload: 2000 }).map((f) => f.spec.label),
      ).toEqual(["Type", "Heavy load note", "Shared"]);
    });
  });
});

describe("applySubmission", () => {
  it("writes values to their paths and leaves unrelated data alone", () => {
    const fields = parse(configurationToImplement);
    const draft = buildDraft(fields, incident);

    expect(applySubmission(fields, draft, incident)).toEqual({
      vehicle: { regplate: "ABC1234", type: "Car", tradeValue: { currency: "EUR", value: 3554.5 } },
      driver: { name: "Peter Nolan", age: 30 },
    });
  });

  it("removes a cleared existing value and skips empty new ones", () => {
    const fields = parse([
      { type: "textInput", label: "Reg", path: "vehicle.regplate" },
      { type: "textInput", label: "Colour", path: "vehicle.colour" },
    ]);

    expect(applySubmission(fields, { vehicle: { regplate: "" } }, incident)).toEqual({
      ...incident,
      vehicle: { tradeValue: incident.vehicle.tradeValue },
    });
  });

  it("keeps unknown keys on a currency object through toValue and submission", () => {
    const data = { price: { currency: "EUR", value: 100, rate: 1.2 } };
    const fields = parse([
      { type: "currencyInput", label: "Price", path: "price", currencies: ["EUR"] },
    ]);
    const draft = { price: { currency: "EUR", value: 150, rate: 1.2 } };

    expect(fields[0].definition.toValue(data.price, fields[0].spec)).toEqual(data.price);
    expect(applySubmission(fields, draft, data)).toEqual(draft);
  });

  it("keeps an edit made through one of several fields sharing a path", () => {
    const data = { shared: { currency: "EUR", value: 5 } };
    const textFirst = parse([
      { type: "textInput", label: "Text", path: "shared" },
      { type: "currencyInput", label: "Money", path: "shared", currencies: ["EUR"] },
    ]);
    const currencyFirst = [...textFirst].reverse();

    expect(applySubmission(textFirst, { shared: "typed" }, data)).toEqual({ shared: "typed" });
    expect(applySubmission(currencyFirst, { shared: "typed" }, data)).toEqual({ shared: "typed" });
  });

  it("does not save an edit to a field that was hidden before submitting", () => {
    const fields = parse([
      { type: "enumInput", label: "Type", path: "type", values: ["Car", "Van"] },
      { type: "currencyInput", label: "Price", path: "price", currencies: ["EUR"] },
      {
        type: "textInput",
        label: "Memo",
        path: "price.memo",
        visibleWhen: { path: "type", equals: "Van" },
      },
    ]);
    const data = { type: "Van", price: { currency: "EUR", value: 5 } };
    const draft = { type: "Car", price: { currency: "EUR", value: 5, memo: "edited" } };

    expect(changedPaths(fields, draft, data)).toEqual(["type"]);
    expect(applySubmission(fields, draft, data)).toEqual({
      type: "Car",
      price: { currency: "EUR", value: 5 },
    });
  });

  it("keeps a visible parent's new value when a hidden child had stored data", () => {
    const fields = parse([
      { type: "enumInput", label: "Type", path: "type", values: ["Car", "Van"] },
      { type: "textInput", label: "Price", path: "price" },
      {
        type: "textInput",
        label: "Memo",
        path: "price.memo",
        visibleWhen: { path: "type", equals: "Van" },
      },
    ]);
    const data = { type: "Van", price: { memo: "m" } };

    expect(applySubmission(fields, { type: "Car", price: "typed" }, data)).toEqual({
      type: "Car",
      price: "typed",
    });
  });

  it("lists the paths a submission changes", () => {
    const fields = parse(configurationToImplement);
    const draft = buildDraft(fields, incident);

    expect(changedPaths(fields, draft, incident)).toEqual([
      "driver.name",
      "vehicle.type",
      "driver.age",
    ]);
  });

  it("leaves data untouched when the form is submitted unchanged", () => {
    const data = {
      driver: { age: 30, licence: "car" },
      shared: "yes",
      drivers: [{ name: "A" }, { name: "B" }],
      claim: { amount: { currency: "JPY", value: 10, rate: 1.2 } },
    };
    const fields = parse([
      { type: "textInput", label: "Age as text", path: "driver.age" },
      { type: "enumInput", label: "Licence", path: "driver.licence", values: ["Car", "Van"] },
      { type: "textInput", label: "Shared text", path: "shared" },
      { type: "integerInput", label: "Shared int", path: "shared" },
      { type: "enumInput", label: "Shared enum", path: "shared", values: ["no"] },
      { type: "textInput", label: "First driver", path: "drivers.0.name" },
    ]);

    expect(applySubmission(fields, buildDraft(fields, data), data)).toEqual(data);
  });

  it("writes into arrays by index without turning them into objects", () => {
    const data = { drivers: [{ name: "A" }, { name: "B" }] };
    const fields = parse([{ type: "textInput", label: "Second driver", path: "drivers.1.name" }]);

    expect(applySubmission(fields, { drivers: [{ name: "A" }, { name: "Bea" }] }, data)).toEqual({
      drivers: [{ name: "A" }, { name: "Bea" }],
    });
  });
});
