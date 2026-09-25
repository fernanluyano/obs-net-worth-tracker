import { App, ItemView, Modal, setIcon, setTooltip, WorkspaceLeaf } from "obsidian";
import { addAccount, formatCents, netWorthAt, type Account, type AccountKind } from "./accounts";
import {
	addCategory,
	addSubcategory,
	deleteCategory,
	deleteSubcategory,
	renameCategory,
	renameSubcategory,
	type BudgetCategory,
} from "./budgetCategories";
import type NetWorthTrackerPlugin from "./main";

export const VIEW_TYPE_NET_WORTH = "net-worth-tracker-view";

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

type TabId = "overview" | "budget" | "debt" | "assets";

const TABS: { id: TabId; label: string }[] = [
	{ id: "overview", label: "Overview" },
	{ id: "budget", label: "Budget" },
	{ id: "debt", label: "Debt" },
	{ id: "assets", label: "Assets" },
];

export class NetWorthView extends ItemView {
	private plugin: NetWorthTrackerPlugin;
	// Overview leads, not Budget (the trading app's default) — the net worth
	// view should be the first thing shown, not buried behind navigation.
	private activeTab: TabId = "overview";

	constructor(leaf: WorkspaceLeaf, plugin: NetWorthTrackerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_NET_WORTH;
	}

	getDisplayText(): string {
		return "Net worth tracker";
	}

	getIcon(): string {
		return "wallet";
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	private render(): void {
		const root = this.contentEl;
		root.empty();
		root.addClass("nwt-view");

		this.renderTabBar(root);
		this.renderActiveTab(root);
	}

	private renderTabBar(root: HTMLElement): void {
		const tabBar = root.createDiv({ cls: "nwt-tabs" });
		for (const tab of TABS) {
			const tabEl = tabBar.createEl("button", { cls: "nwt-tab", text: tab.label });
			tabEl.toggleClass("active", tab.id === this.activeTab);
			tabEl.addEventListener("click", () => {
				if (this.activeTab === tab.id) return;
				this.activeTab = tab.id;
				this.render();
			});
		}
	}

	private renderActiveTab(root: HTMLElement): void {
		const content = root.createDiv({ cls: "nwt-tab-content" });
		switch (this.activeTab) {
			case "overview":
				this.renderOverviewTab(content);
				break;
			case "budget":
				this.renderBudgetTab(content);
				break;
			case "debt":
				this.renderDebtTab(content);
				break;
			case "assets":
				this.renderAssetsTab(content);
				break;
		}
	}

	// ---------------------------------------------------------------------
	// Overview tab
	// ---------------------------------------------------------------------

	private renderOverviewTab(root: HTMLElement): void {
		const sections = ["Net Worth", "Trends", "Savings Buckets", "Recurring Expenses", "Assets", "Debts"];
		for (const title of sections) {
			const section = root.createDiv({ cls: "nwt-section" });
			section.createDiv({ cls: "nwt-section-header", text: title });
			const card = section.createDiv({ cls: "nwt-card" });

			if (title === "Net Worth") {
				this.renderNetWorthCard(card);
				continue;
			}

			card.createEl("p", { cls: "nwt-placeholder", text: "Nothing tracked yet." });
		}
	}

	private renderNetWorthCard(card: HTMLElement): void {
		if (this.plugin.snapshots.length === 0) {
			card.createEl("p", { cls: "nwt-placeholder", text: "Nothing tracked yet." });
			return;
		}
		const total = netWorthAt(this.plugin.accounts, this.plugin.snapshots, todayIso());
		card.createEl("p", { cls: "nwt-net-worth-total", text: formatCents(total) });
	}

	// ---------------------------------------------------------------------
	// Budget tab
	// ---------------------------------------------------------------------

	private renderBudgetTab(root: HTMLElement): void {
		const header = root.createDiv({ cls: "nwt-section-header nwt-budget-header" });
		const nav = header.createDiv({ cls: "nwt-month-nav" });
		const prevBtn = nav.createEl("button", { cls: "nwt-month-nav-btn", text: "‹" });
		prevBtn.disabled = true;
		nav.createSpan({ cls: "nwt-month-label", text: "—" });
		const nextBtn = nav.createEl("button", { cls: "nwt-month-nav-btn", text: "›" });
		nextBtn.disabled = true;

		this.renderStatRow(root, ["Planned", "Actual", "Diff"]);

		const layout = root.createDiv({ cls: "nwt-budget-layout" });
		const categoriesCard = layout.createDiv({ cls: "nwt-card nwt-budget-categories" });
		this.renderCategoryList(categoriesCard);

		const side = layout.createDiv({ cls: "nwt-budget-side" });
		side.createDiv({ cls: "nwt-card" }).createEl("p", { cls: "nwt-placeholder", text: "Nothing here yet." });
		side.createDiv({ cls: "nwt-card" }).createEl("p", { cls: "nwt-placeholder", text: "No transactions yet." });
	}

	// ---------------------------------------------------------------------
	// Budget categories
	// ---------------------------------------------------------------------

	private renderCategoryList(root: HTMLElement): void {
		root.empty();

		const header = root.createDiv({ cls: "nwt-section-header" });
		header.createSpan({ text: "Categories" });
		const addBtn = header.createEl("button", { cls: "nwt-btn", text: "+ Category" });
		addBtn.addEventListener("click", () => {
			new PromptModal(this.app, "New category", "e.g. Groceries", "", (name) => {
				void this.plugin.saveCategories(addCategory(this.plugin.categories, name)).then(() => this.render());
			}).open();
		});

		if (this.plugin.categories.length === 0) {
			root.createEl("p", { cls: "nwt-placeholder", text: "No budget categories yet." });
			return;
		}

		const list = root.createDiv({ cls: "nwt-category-list" });
		for (const category of this.plugin.categories) {
			this.renderCategoryRow(list, category);
		}
	}

	private renderCategoryRow(root: HTMLElement, category: BudgetCategory): void {
		const row = root.createDiv({ cls: "nwt-category" });
		const rowHeader = row.createDiv({ cls: "nwt-category-header" });
		rowHeader.createSpan({ cls: "nwt-category-name", text: category.name });

		const actions = rowHeader.createDiv({ cls: "nwt-row-actions" });
		this.createIconButton(actions, "plus", "Add subcategory", () => {
			new PromptModal(this.app, "New subcategory", "e.g. Produce", "", (name) => {
				void this.plugin
					.saveCategories(addSubcategory(this.plugin.categories, category.id, name))
					.then(() => this.render());
			}).open();
		});
		this.createIconButton(actions, "pencil", "Rename category", () => {
			new PromptModal(this.app, "Rename category", "Category name", category.name, (name) => {
				void this.plugin
					.saveCategories(renameCategory(this.plugin.categories, category.id, name))
					.then(() => this.render());
			}).open();
		});
		this.createIconButton(actions, "trash-2", "Delete category", () => {
			new ConfirmModal(this.app, `Delete "${category.name}" and its subcategories?`, () => {
				void this.plugin
					.saveCategories(deleteCategory(this.plugin.categories, category.id))
					.then(() => this.render());
			}).open();
		});

		if (category.subcategories.length > 0) {
			const subList = row.createDiv({ cls: "nwt-subcategory-list" });
			for (const sub of category.subcategories) {
				const subRow = subList.createDiv({ cls: "nwt-subcategory" });
				subRow.createSpan({ cls: "nwt-subcategory-name", text: sub.name });

				const subActions = subRow.createDiv({ cls: "nwt-row-actions" });
				this.createIconButton(subActions, "pencil", "Rename subcategory", () => {
					new PromptModal(this.app, "Rename subcategory", "Subcategory name", sub.name, (name) => {
						void this.plugin
							.saveCategories(renameSubcategory(this.plugin.categories, category.id, sub.id, name))
							.then(() => this.render());
					}).open();
				});
				this.createIconButton(subActions, "trash-2", "Delete subcategory", () => {
					new ConfirmModal(this.app, `Delete "${sub.name}"?`, () => {
						void this.plugin
							.saveCategories(deleteSubcategory(this.plugin.categories, category.id, sub.id))
							.then(() => this.render());
					}).open();
				});
			}
		}
	}

	private createIconButton(root: HTMLElement, icon: string, tooltip: string, onClick: () => void): void {
		const btn = root.createEl("button", { cls: "nwt-icon-btn" });
		setIcon(btn, icon);
		setTooltip(btn, tooltip);
		btn.addEventListener("click", onClick);
	}

	// ---------------------------------------------------------------------
	// Debt tab
	// ---------------------------------------------------------------------

	private renderDebtTab(root: HTMLElement): void {
		this.renderStatRow(root, ["Total Debt", "Total Min. Payment", "Accounts"]);

		const grid = root.createDiv({ cls: "nwt-card-grid" });
		grid.createEl("p", { cls: "nwt-placeholder", text: "No debts tracked yet." });
	}

	// ---------------------------------------------------------------------
	// Assets tab
	// ---------------------------------------------------------------------

	private renderAssetsTab(root: HTMLElement): void {
		const header = root.createDiv({ cls: "nwt-section-header nwt-assets-header" });
		header.createSpan({ text: "Assets" });
		const actions = header.createDiv({ cls: "nwt-header-actions" });
		actions.createEl("button", { cls: "nwt-btn", text: "+ Add" }).addEventListener("click", () => {
			new AddAccountModal(this.app, (name, kind) => {
				void this.plugin.saveAccounts(addAccount(this.plugin.accounts, name, kind)).then(() => this.render());
			}).open();
		});
		// Present but inert — nothing external to refresh from yet.
		actions.createEl("button", { cls: "nwt-btn", text: "Refresh" });

		const accounts = this.plugin.accounts.filter((account) => !account.archived);
		if (accounts.length === 0) {
			root.createDiv({ cls: "nwt-card" }).createEl("p", {
				cls: "nwt-placeholder",
				text: "No accounts tracked yet.",
			});
			return;
		}

		const list = root.createDiv({ cls: "nwt-card nwt-account-list" });
		for (const account of accounts) {
			this.renderAccountRow(list, account);
		}
	}

	private renderAccountRow(root: HTMLElement, account: Account): void {
		const row = root.createDiv({ cls: "nwt-account" });
		row.createSpan({ cls: "nwt-account-name", text: account.name });
		const meta = account.subtype ? `${account.kind} · ${account.subtype}` : account.kind;
		row.createSpan({ cls: "nwt-account-kind", text: meta });
	}

	// ---------------------------------------------------------------------
	// Shared primitives
	// ---------------------------------------------------------------------

	private renderStatRow(root: HTMLElement, labels: string[]): void {
		const row = root.createDiv({ cls: "nwt-stat-row" });
		for (const label of labels) {
			const stat = row.createDiv({ cls: "nwt-stat" });
			stat.createDiv({ cls: "nwt-stat-value", text: "—" });
			stat.createDiv({ cls: "nwt-stat-label", text: label });
		}
	}
}

class PromptModal extends Modal {
	private value: string;

	constructor(
		app: App,
		private title: string,
		private placeholder: string,
		initialValue: string,
		private onSubmit: (value: string) => void
	) {
		super(app);
		this.value = initialValue;
	}

	onOpen(): void {
		this.contentEl.createEl("h3", { text: this.title });

		const input = this.contentEl.createEl("input", { type: "text", cls: "nwt-modal-input" });
		input.placeholder = this.placeholder;
		input.value = this.value;
		input.addEventListener("input", () => {
			this.value = input.value;
		});
		input.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") this.submit();
		});

		const buttonRow = this.contentEl.createDiv({ cls: "nwt-modal-buttons" });
		buttonRow.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
		buttonRow.createEl("button", { text: "Save", cls: "mod-cta" }).addEventListener("click", () => this.submit());

		input.focus();
		input.select();
	}

	private submit(): void {
		if (!this.value.trim()) return;
		this.close();
		this.onSubmit(this.value);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

class AddAccountModal extends Modal {
	private name = "";
	private kind: AccountKind = "asset";

	constructor(
		app: App,
		private onSubmit: (name: string, kind: AccountKind) => void
	) {
		super(app);
	}

	onOpen(): void {
		this.contentEl.createEl("h3", { text: "New account" });

		const input = this.contentEl.createEl("input", { type: "text", cls: "nwt-modal-input" });
		input.placeholder = "e.g. Checking";
		input.addEventListener("input", () => {
			this.name = input.value;
		});
		input.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") this.submit();
		});

		const select = this.contentEl.createEl("select", { cls: "nwt-modal-input" });
		select.createEl("option", { value: "asset", text: "Asset" });
		select.createEl("option", { value: "liability", text: "Liability" });
		select.addEventListener("change", () => {
			this.kind = select.value as AccountKind;
		});

		const buttonRow = this.contentEl.createDiv({ cls: "nwt-modal-buttons" });
		buttonRow.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
		buttonRow.createEl("button", { text: "Save", cls: "mod-cta" }).addEventListener("click", () => this.submit());

		input.focus();
	}

	private submit(): void {
		if (!this.name.trim()) return;
		this.close();
		this.onSubmit(this.name, this.kind);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

class ConfirmModal extends Modal {
	constructor(
		app: App,
		private message: string,
		private onConfirm: () => void
	) {
		super(app);
	}

	onOpen(): void {
		this.contentEl.createEl("p", { text: this.message });

		const buttonRow = this.contentEl.createDiv({ cls: "nwt-modal-buttons" });
		buttonRow.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
		buttonRow.createEl("button", { text: "Delete", cls: "mod-warning" }).addEventListener("click", () => {
			this.close();
			this.onConfirm();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
