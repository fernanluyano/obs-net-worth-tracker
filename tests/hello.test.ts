import { describe, expect, it } from "vitest";
import { greet } from "../hello";

describe("greet", () => {
	it("includes the given name in the greeting", () => {
		expect(greet("there")).toBe("Hello, there! Net Worth Tracker is up and running.");
	});
});
