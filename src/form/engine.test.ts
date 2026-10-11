import configurationToImplement from "../data/configurationToImplement.json";
import incident from "../data/incident.json";
import { applySubmission, buildDraft, parseConfig, validateFields, visibleFields } from "./engine";
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
      { type: "integerInput", label: "Bad range", path: "c", min: 10, max: 1 },
      "nonsense",
      { type: "textInput", label: "Kept", path: "d", unknownProp: true },
    ]);

    expect(fields.map((f) => f.spec.label)).toEqual(["Kept"]);
    expect(warnings).toHaveLength(5);
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
    expect(warnings).toEqual(["Field 1: unsupported visibleWhen ignored"]);
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
    const fields = parse([{ type: "enumInput", label: "Type", path: "type", values: ["Car"], defaultValue: "Boat" }]);

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
    expect(validateFields(fields, { name: " ", age: 120, value: { currency: "", value: 10 } })).toEqual({
      "field-0": "This field is required",
      "field-1": "Must be between 18 and 99",
      "field-2": "Select a currency",
    });
  });

  it("passes empty optional fields", () => {
    expect(validateFields(fields, { name: "Ann" })).toEqual({});
  });
});

describe("visibleFields", () => {
  const fields = parse([
    { type: "enumInput", label: "Type", path: "type", values: ["Car", "Van"] },
    { type: "integerInput", label: "Payload", path: "payload", visibleWhen: { path: "type", equals: "Van" } },
    {
      type: "textInput",
      label: "Note",
      path: "note",
      visibleWhen: { any: [{ path: "value.value", gt: 1000 }, { not: { path: "type", filled: true } }] },
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
});

describe("visibleFields with dependent conditions", () => {
  const fields = parse([
    { type: "enumInput", label: "Type", path: "type", values: ["Car", "Van"] },
    { type: "integerInput", label: "Payload", path: "payload", visibleWhen: { path: "type", equals: "Van" } },
    { type: "textInput", label: "Heavy load note", path: "note", visibleWhen: { path: "payload", gt: 1000 } },
    { type: "textInput", label: "Shared", path: "payload", visibleWhen: { path: "type", equals: "Car" } },
  ]);

  it("ignores values of hidden fields when evaluating other conditions", () => {
    const labels = (draft: Incident) => visibleFields(fields.slice(0, 3), draft).map((f) => f.spec.label);

    expect(labels({ type: "Van", payload: 2000 })).toEqual(["Type", "Payload", "Heavy load note"]);
    expect(labels({ type: "Car", payload: 2000 })).toEqual(["Type"]);
  });

  it("keeps a hidden field's path when a visible field shares it", () => {
    expect(visibleFields(fields, { type: "Car", payload: 2000 }).map((f) => f.spec.label)).toEqual([
      "Type",
      "Heavy load note",
      "Shared",
    ]);
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

  it("nulls a cleared existing value and skips empty new ones", () => {
    const fields = parse([
      { type: "textInput", label: "Reg", path: "vehicle.regplate" },
      { type: "textInput", label: "Colour", path: "vehicle.colour" },
    ]);

    expect(applySubmission(fields, { vehicle: { regplate: "" } }, incident)).toEqual({
      ...incident,
      vehicle: { ...incident.vehicle, regplate: null },
    });
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
