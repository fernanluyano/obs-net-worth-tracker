export interface BudgetSubcategory {
	id: string;
	name: string;
}

export interface BudgetCategory {
	id: string;
	name: string;
	subcategories: BudgetSubcategory[];
}

function generateId(): string {
	return crypto.randomUUID();
}

export function addCategory(categories: BudgetCategory[], name: string): BudgetCategory[] {
	const trimmed = name.trim();
	if (!trimmed) return categories;
	return [...categories, { id: generateId(), name: trimmed, subcategories: [] }];
}

export function renameCategory(categories: BudgetCategory[], categoryId: string, name: string): BudgetCategory[] {
	const trimmed = name.trim();
	if (!trimmed) return categories;
	return categories.map((category) => (category.id === categoryId ? { ...category, name: trimmed } : category));
}

export function deleteCategory(categories: BudgetCategory[], categoryId: string): BudgetCategory[] {
	return categories.filter((category) => category.id !== categoryId);
}

export function addSubcategory(categories: BudgetCategory[], categoryId: string, name: string): BudgetCategory[] {
	const trimmed = name.trim();
	if (!trimmed) return categories;
	return categories.map((category) =>
		category.id === categoryId
			? { ...category, subcategories: [...category.subcategories, { id: generateId(), name: trimmed }] }
			: category
	);
}

export function renameSubcategory(
	categories: BudgetCategory[],
	categoryId: string,
	subcategoryId: string,
	name: string
): BudgetCategory[] {
	const trimmed = name.trim();
	if (!trimmed) return categories;
	return categories.map((category) =>
		category.id === categoryId
			? {
					...category,
					subcategories: category.subcategories.map((sub) =>
						sub.id === subcategoryId ? { ...sub, name: trimmed } : sub
					),
				}
			: category
	);
}

export function deleteSubcategory(
	categories: BudgetCategory[],
	categoryId: string,
	subcategoryId: string
): BudgetCategory[] {
	return categories.map((category) =>
		category.id === categoryId
			? { ...category, subcategories: category.subcategories.filter((sub) => sub.id !== subcategoryId) }
			: category
	);
}
