import { render, screen, within } from "@testing-library/react";
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
});
