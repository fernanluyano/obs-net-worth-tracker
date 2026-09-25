export type AccountKind = "asset" | "liability";

export interface Account {
	id: string;
	name: string;
	kind: AccountKind;
	subtype?: string;
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

export function addAccount(accounts: Account[], name: string, kind: AccountKind, subtype?: string): Account[] {
	const trimmed = name.trim();
	if (!trimmed) return accounts;
	const account: Account = { id: generateId(), name: trimmed, kind, archived: false };
	const trimmedSubtype = subtype?.trim();
	if (trimmedSubtype) account.subtype = trimmedSubtype;
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
