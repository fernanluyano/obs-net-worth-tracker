import type { Account, Snapshot } from "./accounts";
import type { BudgetCategory } from "./budgetCategories";

// Bump whenever the persisted shape changes, and add a migration function
// here. Read once on load (main.ts's loadPluginData) to decide whether
// migration is needed at all — keep that check a single number comparison,
// not a per-record shape probe, so every load after the first migration
// stays cheap.
export const CURRENT_SCHEMA_VERSION = 2;

// The on-disk shape at schema v1: budget categories only, predating
// accounts/snapshots.
export interface LegacyPluginDataV1 {
	categories?: BudgetCategory[];
}

export interface MigratedPluginData {
	categories: BudgetCategory[];
	accounts: Account[];
	snapshots: Snapshot[];
}

// v1 -> v2: introduces accounts/snapshots. Nothing to backfill — v1 predates
// the concept entirely — so they default to empty.
export function migrateToV2(data: LegacyPluginDataV1): MigratedPluginData {
	return {
		categories: data.categories ?? [],
		accounts: [],
		snapshots: [],
	};
}
