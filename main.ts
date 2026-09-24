import { Plugin, WorkspaceLeaf } from "obsidian";
import { NetWorthView, VIEW_TYPE_NET_WORTH } from "./view";
import type { BudgetCategory } from "./budgetCategories";

// Bump whenever the persisted shape below changes, and add a migration
// function at that point — there's nothing to migrate from yet at v1.
const CURRENT_SCHEMA_VERSION = 1;

interface PluginData {
	schemaVersion: number;
	categories: BudgetCategory[];
}

export default class NetWorthTrackerPlugin extends Plugin {
	categories: BudgetCategory[] = [];

	async onload(): Promise<void> {
		await this.loadPluginData();

		this.registerView(VIEW_TYPE_NET_WORTH, (leaf) => new NetWorthView(leaf, this));

		this.addRibbonIcon("wallet", "Net worth tracker", () => {
			void this.activateView();
		});

		this.addCommand({
			id: "open-net-worth-tracker",
			name: "Open net worth tracker",
			callback: () => {
				void this.activateView();
			},
		});
	}

	async activateView(): Promise<NetWorthView> {
		const { workspace } = this.app;

		const existing = workspace.getLeavesOfType(VIEW_TYPE_NET_WORTH);
		const leaf: WorkspaceLeaf = existing.length > 0 ? existing[0] : workspace.getLeaf(true);

		if (existing.length === 0) {
			await leaf.setViewState({ type: VIEW_TYPE_NET_WORTH, active: true });
		}
		await workspace.revealLeaf(leaf);
		return leaf.view as NetWorthView;
	}

	async loadPluginData(): Promise<void> {
		const data = ((await this.loadData()) ?? {}) as Partial<PluginData>;
		this.categories = data.categories ?? [];
	}

	async saveCategories(categories: BudgetCategory[]): Promise<void> {
		this.categories = categories;
		await this.persist();
	}

	private async persist(): Promise<void> {
		const data: PluginData = {
			schemaVersion: CURRENT_SCHEMA_VERSION,
			categories: this.categories,
		};
		await this.saveData(data);
	}
}
