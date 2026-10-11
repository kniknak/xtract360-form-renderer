import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

const output = () => JSON.parse(screen.getByTestId("output").textContent ?? "");

describe("App", () => {
  it("renders the config, edits values and shows the updated incident on submit", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByLabelText("Driver Name")).toHaveValue("Peter Nolan");
    expect(screen.getByLabelText("Vehicle Regplate")).toHaveValue("ABC1234");

    await user.clear(screen.getByLabelText("Driver Age"));
    await user.type(screen.getByLabelText("Driver Age"), "42");
    await user.click(screen.getByLabelText("Vehicle Type"));
    await user.click(within(screen.getByRole("listbox")).getByText("Van"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(output()).toMatchObject({
      driver: { name: "Peter Nolan", age: 42 },
      vehicle: { type: "Van", tradeValue: { currency: "EUR", value: 3554.5 } },
    });
  });

  it("blocks submission until required fields are filled and reveals conditional fields", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByLabelText("Configuration"));
    await user.click(screen.getByText("Required & conditional fields"));

    expect(screen.getByText(/unsupported type "dateInput"/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Payload/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getAllByText("This field is required")).toHaveLength(2);
    expect(screen.queryByTestId("output")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Driver Name/), "Ann");
    await user.click(screen.getByLabelText(/Vehicle Type/));
    await user.click(within(screen.getByRole("listbox")).getByText("Van"));
    await user.type(await screen.findByLabelText(/Payload/), "800");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(output()).toMatchObject({ driver: { name: "Ann" }, vehicle: { type: "Van", payloadKg: 800 } });
  });

  it("applies a pasted configuration with comments, new order, labels and paths", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Edit configuration & incident data"));
    fireEvent.change(screen.getByLabelText("Configuration (JSON)"), {
      target: {
        value: `[
          // pasted by the reviewer
          { "type": "integerInput", "label": "Passengers", "path": "vehicle.passengers", "min": 1, "max": 8 },
          { "type": "textInput", "label": "Registration", "path": "vehicle.regplate" },
        ]`,
      },
    });
    await user.click(screen.getByRole("button", { name: "Apply" }));

    const form = screen.getByRole("button", { name: "Save changes" }).closest("form")!;
    const labels = within(form).getAllByRole("textbox").map((input) => (input as HTMLInputElement).labels?.[0]?.textContent);
    expect(labels).toEqual(["Passengers", "Registration"]);
    expect(screen.getByLabelText("Registration")).toHaveValue("ABC1234");
    expect(screen.queryByLabelText("Driver Name")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Passengers"), "3");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(output()).toMatchObject({ vehicle: { regplate: "ABC1234", passengers: 3 } });
  });

  it("shows a parse error for invalid pasted JSON", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Edit configuration & incident data"));
    fireEvent.change(screen.getByLabelText("Configuration (JSON)"), { target: { value: "[ {" } });
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByText("Configuration is not valid JSON")).toBeInTheDocument();
  });

  it("handles the sample configuration where every field shares one path", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByLabelText("Configuration"));
    await user.click(screen.getByText("Sample configuration (spec)"));

    await user.type(screen.getByLabelText("This is a text input"), "hello");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(output().store.the.data.here).toBe("hello");

    await user.click(screen.getByLabelText("Currency"));
    await user.click(within(screen.getByRole("listbox")).getByText("GBP"));
    await user.type(screen.getByLabelText("This is a currency input"), "50");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(output().store.the.data.here).toEqual({ currency: "GBP", value: 50 });
    expect(screen.getByLabelText("This is a text input")).toHaveValue("");
  });
});
