import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function Hello({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}

describe("Example", () => {
  it("renders greeting", () => {
    render(<Hello name="bspshark" />);
    expect(screen.getByText("Hello, bspshark!")).toBeDefined();
  });
});
