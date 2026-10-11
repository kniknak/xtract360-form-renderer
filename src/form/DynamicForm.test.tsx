import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DynamicForm from "./DynamicForm";
import { parseConfig } from "./engine";

const renderForm = (config: unknown[], incident: Record<string, unknown>) => {
  const onSubmit = vi.fn();
  render(
    <DynamicForm fields={parseConfig(config).fields} incident={incident} onSubmit={onSubmit} />,
  );
  return onSubmit;
};

describe("DynamicForm", () => {
  it("clears an optional currency value", async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm(
      [{ type: "currencyInput", label: "Price", path: "price", currencies: ["EUR"] }],
      { price: { currency: "EUR", value: 5 }, other: 1 },
    );

    await user.click(screen.getByLabelText("Currency"));
    await user.click(within(screen.getByRole("listbox")).getByText("None"));
    await user.clear(screen.getByLabelText("Price"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith({ other: 1 }, ["price"]);
  });

  it("stops typing currency digits before the amount would lose precision", async () => {
    const user = userEvent.setup();
    renderForm([{ type: "currencyInput", label: "Price", path: "price", currencies: ["EUR"] }], {});

    await user.type(screen.getByLabelText("Price"), "100000000000000.01");

    expect(screen.getByLabelText("Price")).toHaveValue("1000000000000.01");
  });
});
