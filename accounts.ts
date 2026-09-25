export type AccountKind = "asset" | "liability";

export type AssetAccountType =
	| "cash"
	| "real-estate"
	| "precious-metals"
	| "retirement"
	| "investments"
	| "vehicle"
	| "other";

export type LiabilityAccountType = "credit-card" | "mortgage" | "loan" | "other-liability";

export type AccountType = AssetAccountType | LiabilityAccountType;

// Single source of truth for which `type` values are valid for each `kind`,
// and their display labels — both addAccount's validation and the Add
// Account modal's dropdown read from this instead of duplicating the list.
export const ACCOUNT_TYPES_BY_KIND: Record<AccountKind, { value: AccountType; label: string }[]> = {
	asset: [
		{ value: "cash", label: "Cash/Bank" },
		{ value: "real-estate", label: "Real Estate" },
		{ value: "precious-metals", label: "Precious Metals" },
		{ value: "retirement", label: "Retirement" },
		{ value: "investments", label: "Investments/Brokerage" },
		{ value: "vehicle", label: "Vehicle" },
		{ value: "other", label: "Other" },
	],
	liability: [
		{ value: "credit-card", label: "Credit Card" },
		{ value: "mortgage", label: "Mortgage" },
		{ value: "loan", label: "Loan" },
		{ value: "other-liability", label: "Other Liability" },
	],
};

export function isValidAccountType(kind: AccountKind, type: AccountType): boolean {
	return ACCOUNT_TYPES_BY_KIND[kind].some((option) => option.value === type);
}

export function accountTypeLabel(kind: AccountKind, type: AccountType): string | undefined {
	return ACCOUNT_TYPES_BY_KIND[kind].find((option) => option.value === type)?.label;
}

export interface Account {
	id: string;
	name: string;
	kind: AccountKind;
	type?: AccountType;
	archived: boolean;
}

export interface Snapshot {
	id: string;
	accountId: string;
	date: string; // ISO date, YYYY-MM-DD
	balanceCents: number;
}

function generateId(): string {
	return crypto.randomUUID();
}

export function addAccount(accounts: Account[], name: string, kind: AccountKind, type?: AccountType): Account[] {
	const trimmed = name.trim();
	if (!trimmed) return accounts;
	const account: Account = { id: generateId(), name: trimmed, kind, archived: false };
	if (type && isValidAccountType(kind, type)) account.type = type;
	return [...accounts, account];
}

export function renameAccount(accounts: Account[], accountId: string, name: string): Account[] {
	const trimmed = name.trim();
	if (!trimmed) return accounts;
	return accounts.map((account) => (account.id === accountId ? { ...account, name: trimmed } : account));
}

export function archiveAccount(accounts: Account[], accountId: string): Account[] {
	return accounts.map((account) => (account.id === accountId ? { ...account, archived: true } : account));
}

// Add-or-replace for a given account+date, so re-entering the same day's
// balance edits it instead of piling up duplicate snapshots.
export function recordSnapshot(
	snapshots: Snapshot[],
	accountId: string,
	date: string,
	balanceCents: number
): Snapshot[] {
	const existingIndex = snapshots.findIndex((s) => s.accountId === accountId && s.date === date);
	if (existingIndex === -1) {
		return [...snapshots, { id: generateId(), accountId, date, balanceCents }];
	}
	const updated = [...snapshots];
	updated[existingIndex] = { ...updated[existingIndex], balanceCents };
	return updated;
}

function latestSnapshotOnOrBefore(snapshots: Snapshot[], accountId: string, date: string): Snapshot | undefined {
	let latest: Snapshot | undefined;
	for (const snapshot of snapshots) {
		if (snapshot.accountId !== accountId || snapshot.date > date) continue;
		if (!latest || snapshot.date > latest.date) latest = snapshot;
	}
	return latest;
}

// Not filtered by `archived` — an archived account's last recorded balance
// still belongs in the historical total for any date up to and including
// when it was closed out, same as any other account's latest snapshot.
export function netWorthAt(accounts: Account[], snapshots: Snapshot[], date: string): number {
	let totalCents = 0;
	for (const account of accounts) {
		const latest = latestSnapshotOnOrBefore(snapshots, account.id, date);
		if (!latest) continue;
		totalCents += account.kind === "asset" ? latest.balanceCents : -latest.balanceCents;
	}
	return totalCents;
}

export function formatCents(cents: number): string {
	const formatted = (Math.abs(cents) / 100).toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return cents < 0 ? `-$${formatted}` : `$${formatted}`;
}
