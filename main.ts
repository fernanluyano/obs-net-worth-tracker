import { Plugin, WorkspaceLeaf } from "obsidian";
import { NetWorthView, VIEW_TYPE_NET_WORTH } from "./view";
import type { Account, Snapshot } from "./accounts";
import type { BudgetCategory } from "./budgetCategories";
import { CURRENT_SCHEMA_VERSION, migrateToV2, type LegacyPluginDataV1 } from "./migrations";

interface PluginData {
	schemaVersion: number;
	categories: BudgetCategory[];
	accounts: Account[];
	snapshots: Snapshot[];
}

export default class NetWorthTrackerPlugin extends Plugin {
	categories: BudgetCategory[] = [];
	accounts: Account[] = [];
	snapshots: Snapshot[] = [];

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
		const schemaVersion = data.schemaVersion ?? 1;

		if (schemaVersion >= CURRENT_SCHEMA_VERSION) {
			this.categories = data.categories ?? [];
			this.accounts = data.accounts ?? [];
			this.snapshots = data.snapshots ?? [];
			return;
		}

		const migrated = migrateToV2(data as LegacyPluginDataV1);
		this.categories = migrated.categories;
		this.accounts = migrated.accounts;
		this.snapshots = migrated.snapshots;
		// Persist immediately so a vault re-opened without being edited still
		// ends up migrated instead of stuck on the old shape.
		await this.persist();
	}

	async saveCategories(categories: BudgetCategory[]): Promise<void> {
		this.categories = categories;
		await this.persist();
	}

	async saveAccounts(accounts: Account[]): Promise<void> {
		this.accounts = accounts;
		await this.persist();
	}

	private async persist(): Promise<void> {
		const data: PluginData = {
			schemaVersion: CURRENT_SCHEMA_VERSION,
			categories: this.categories,
			accounts: this.accounts,
			snapshots: this.snapshots,
		};
		await this.saveData(data);
	}
}
