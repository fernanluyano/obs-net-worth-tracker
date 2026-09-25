import { describe, expect, it } from "vitest";
import { migrateToV2 } from "../migrations";

describe("migrateToV2", () => {
	it("defaults accounts and snapshots to empty when migrating from v1", () => {
		const result = migrateToV2({ categories: [] });
		expect(result.accounts).toEqual([]);
		expect(result.snapshots).toEqual([]);
	});

	it("preserves existing v1 categories untouched", () => {
		const categories = [{ id: "cat-1", name: "Rent", subcategories: [] }];
		const result = migrateToV2({ categories });
		expect(result.categories).toEqual(categories);
	});

	it("defaults categories to empty when missing entirely", () => {
		const result = migrateToV2({});
		expect(result.categories).toEqual([]);
	});
});
