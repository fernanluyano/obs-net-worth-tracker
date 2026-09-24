import { describe, expect, it } from "vitest";
import {
	addCategory,
	addSubcategory,
	deleteCategory,
	deleteSubcategory,
	renameCategory,
	renameSubcategory,
	type BudgetCategory,
} from "../budgetCategories";

describe("addCategory", () => {
	it("appends a new category with an empty subcategory list", () => {
		const result = addCategory([], "Groceries");
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Groceries");
		expect(result[0].subcategories).toEqual([]);
		expect(result[0].id).toBeTruthy();
	});

	it("trims whitespace from the name", () => {
		const result = addCategory([], "  Rent  ");
		expect(result[0].name).toBe("Rent");
	});

	it("is a no-op for a blank name", () => {
		const categories: BudgetCategory[] = [];
		expect(addCategory(categories, "   ")).toBe(categories);
	});

	it("does not mutate the input array", () => {
		const categories: BudgetCategory[] = [];
		addCategory(categories, "Groceries");
		expect(categories).toHaveLength(0);
	});

	it("assigns distinct ids across categories", () => {
		const result = addCategory(addCategory([], "Rent"), "Groceries");
		expect(result[0].id).not.toBe(result[1].id);
	});
});

describe("renameCategory", () => {
	it("renames the matching category and leaves others untouched", () => {
		const categories = addCategory(addCategory([], "Rent"), "Groceries");
		const result = renameCategory(categories, categories[0].id, "Housing");
		expect(result[0].name).toBe("Housing");
		expect(result[1].name).toBe("Groceries");
	});

	it("is a no-op when the id doesn't match", () => {
		const categories = addCategory([], "Rent");
		const result = renameCategory(categories, "missing-id", "Housing");
		expect(result[0].name).toBe("Rent");
	});

	it("is a no-op for a blank name", () => {
		const categories = addCategory([], "Rent");
		const result = renameCategory(categories, categories[0].id, "  ");
		expect(result[0].name).toBe("Rent");
	});

	it("trims whitespace from the name", () => {
		const categories = addCategory([], "Rent");
		const result = renameCategory(categories, categories[0].id, "  Housing  ");
		expect(result[0].name).toBe("Housing");
	});

	it("does not mutate the input array", () => {
		const categories = addCategory([], "Rent");
		renameCategory(categories, categories[0].id, "Housing");
		expect(categories[0].name).toBe("Rent");
	});
});

describe("deleteCategory", () => {
	it("removes only the matching category", () => {
		const categories = addCategory(addCategory([], "Rent"), "Groceries");
		const result = deleteCategory(categories, categories[0].id);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Groceries");
	});

	it("is a no-op when the id doesn't match", () => {
		const categories = addCategory([], "Rent");
		const result = deleteCategory(categories, "missing-id");
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Rent");
	});

	it("does not mutate the input array", () => {
		const categories = addCategory([], "Rent");
		deleteCategory(categories, categories[0].id);
		expect(categories).toHaveLength(1);
	});
});

describe("addSubcategory", () => {
	it("appends a subcategory under the matching category", () => {
		const categories = addCategory([], "Groceries");
		const result = addSubcategory(categories, categories[0].id, "Produce");
		expect(result[0].subcategories).toHaveLength(1);
		expect(result[0].subcategories[0].name).toBe("Produce");
	});

	it("trims whitespace from the name", () => {
		const categories = addCategory([], "Groceries");
		const result = addSubcategory(categories, categories[0].id, "  Produce  ");
		expect(result[0].subcategories[0].name).toBe("Produce");
	});

	it("is a no-op when the category id doesn't match", () => {
		const categories = addCategory([], "Groceries");
		const result = addSubcategory(categories, "missing-id", "Produce");
		expect(result[0].subcategories).toHaveLength(0);
	});

	it("is a no-op for a blank name", () => {
		const categories = addCategory([], "Groceries");
		const result = addSubcategory(categories, categories[0].id, "   ");
		expect(result[0].subcategories).toHaveLength(0);
	});

	it("assigns distinct ids across subcategories", () => {
		let categories = addCategory([], "Groceries");
		categories = addSubcategory(categories, categories[0].id, "Produce");
		categories = addSubcategory(categories, categories[0].id, "Snacks");
		expect(categories[0].subcategories[0].id).not.toBe(categories[0].subcategories[1].id);
	});

	it("does not mutate the input array", () => {
		const categories = addCategory([], "Groceries");
		addSubcategory(categories, categories[0].id, "Produce");
		expect(categories[0].subcategories).toHaveLength(0);
	});
});

describe("renameSubcategory", () => {
	it("renames only the matching subcategory", () => {
		let categories = addCategory([], "Groceries");
		categories = addSubcategory(categories, categories[0].id, "Produce");
		categories = addSubcategory(categories, categories[0].id, "Snacks");
		const targetId = categories[0].subcategories[0].id;

		const result = renameSubcategory(categories, categories[0].id, targetId, "Fresh Produce");
		expect(result[0].subcategories[0].name).toBe("Fresh Produce");
		expect(result[0].subcategories[1].name).toBe("Snacks");
	});

	it("trims whitespace from the name", () => {
		let categories = addCategory([], "Groceries");
		categories = addSubcategory(categories, categories[0].id, "Produce");
		const targetId = categories[0].subcategories[0].id;

		const result = renameSubcategory(categories, categories[0].id, targetId, "  Fresh Produce  ");
		expect(result[0].subcategories[0].name).toBe("Fresh Produce");
	});

	it("is a no-op when the category id doesn't match", () => {
		let categories = addCategory([], "Groceries");
		categories = addSubcategory(categories, categories[0].id, "Produce");
		const targetId = categories[0].subcategories[0].id;

		const result = renameSubcategory(categories, "missing-id", targetId, "Fresh Produce");
		expect(result[0].subcategories[0].name).toBe("Produce");
	});

	it("is a no-op when the subcategory id doesn't match", () => {
		let categories = addCategory([], "Groceries");
		categories = addSubcategory(categories, categories[0].id, "Produce");

		const result = renameSubcategory(categories, categories[0].id, "missing-id", "Fresh Produce");
		expect(result[0].subcategories[0].name).toBe("Produce");
	});

	it("is a no-op for a blank name", () => {
		let categories = addCategory([], "Groceries");
		categories = addSubcategory(categories, categories[0].id, "Produce");
		const targetId = categories[0].subcategories[0].id;

		const result = renameSubcategory(categories, categories[0].id, targetId, "   ");
		expect(result[0].subcategories[0].name).toBe("Produce");
	});
});

describe("deleteSubcategory", () => {
	it("removes only the matching subcategory", () => {
		let categories = addCategory([], "Groceries");
		categories = addSubcategory(categories, categories[0].id, "Produce");
		categories = addSubcategory(categories, categories[0].id, "Snacks");
		const targetId = categories[0].subcategories[0].id;

		const result = deleteSubcategory(categories, categories[0].id, targetId);
		expect(result[0].subcategories).toHaveLength(1);
		expect(result[0].subcategories[0].name).toBe("Snacks");
	});

	it("is a no-op when the category id doesn't match", () => {
		let categories = addCategory([], "Groceries");
		categories = addSubcategory(categories, categories[0].id, "Produce");
		const targetId = categories[0].subcategories[0].id;

		const result = deleteSubcategory(categories, "missing-id", targetId);
		expect(result[0].subcategories).toHaveLength(1);
	});

	it("is a no-op when the subcategory id doesn't match", () => {
		let categories = addCategory([], "Groceries");
		categories = addSubcategory(categories, categories[0].id, "Produce");

		const result = deleteSubcategory(categories, categories[0].id, "missing-id");
		expect(result[0].subcategories).toHaveLength(1);
	});
});
