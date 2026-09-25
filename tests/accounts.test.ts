import { describe, expect, it } from "vitest";
import {
	accountTypeLabel,
	addAccount,
	archiveAccount,
	assetBreakdownByType,
	formatCents,
	isValidAccountType,
	netWorthAt,
	recordSnapshot,
	renameAccount,
	type Account,
	type Snapshot,
} from "../accounts";

describe("addAccount", () => {
	it("appends a new, non-archived account", () => {
		const result = addAccount([], "Checking", "asset");
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Checking");
		expect(result[0].kind).toBe("asset");
		expect(result[0].archived).toBe(false);
		expect(result[0].id).toBeTruthy();
	});

	it("stores a type valid for the given kind", () => {
		const result = addAccount([], "Checking", "asset", "cash");
		expect(result[0].type).toBe("cash");
	});

	it("omits a type that isn't valid for the given kind", () => {
		const result = addAccount([], "Mortgage", "liability", "cash");
		expect(result[0].type).toBeUndefined();
	});

	it("omits type when none is given", () => {
		const result = addAccount([], "Checking", "asset");
		expect(result[0].type).toBeUndefined();
	});

	it("trims whitespace from the name", () => {
		const result = addAccount([], "  Checking  ", "asset");
		expect(result[0].name).toBe("Checking");
	});

	it("is a no-op for a blank name", () => {
		const accounts: Account[] = [];
		expect(addAccount(accounts, "   ", "asset")).toBe(accounts);
	});

	it("does not mutate the input array", () => {
		const accounts: Account[] = [];
		addAccount(accounts, "Checking", "asset");
		expect(accounts).toHaveLength(0);
	});

	it("assigns distinct ids across accounts", () => {
		const result = addAccount(addAccount([], "Checking", "asset"), "Mortgage", "liability");
		expect(result[0].id).not.toBe(result[1].id);
	});
});

describe("renameAccount", () => {
	it("renames the matching account and leaves others untouched", () => {
		const accounts = addAccount(addAccount([], "Checking", "asset"), "Mortgage", "liability");
		const result = renameAccount(accounts, accounts[0].id, "Primary Checking");
		expect(result[0].name).toBe("Primary Checking");
		expect(result[1].name).toBe("Mortgage");
	});

	it("is a no-op when the id doesn't match", () => {
		const accounts = addAccount([], "Checking", "asset");
		const result = renameAccount(accounts, "missing-id", "Primary Checking");
		expect(result[0].name).toBe("Checking");
	});

	it("is a no-op for a blank name", () => {
		const accounts = addAccount([], "Checking", "asset");
		const result = renameAccount(accounts, accounts[0].id, "   ");
		expect(result[0].name).toBe("Checking");
	});

	it("does not mutate the input array", () => {
		const accounts = addAccount([], "Checking", "asset");
		renameAccount(accounts, accounts[0].id, "Primary Checking");
		expect(accounts[0].name).toBe("Checking");
	});
});

describe("archiveAccount", () => {
	it("marks only the matching account as archived", () => {
		const accounts = addAccount(addAccount([], "Checking", "asset"), "Mortgage", "liability");
		const result = archiveAccount(accounts, accounts[0].id);
		expect(result[0].archived).toBe(true);
		expect(result[1].archived).toBe(false);
	});

	it("is a no-op when the id doesn't match", () => {
		const accounts = addAccount([], "Checking", "asset");
		const result = archiveAccount(accounts, "missing-id");
		expect(result[0].archived).toBe(false);
	});
});

describe("recordSnapshot", () => {
	it("appends a new snapshot for a fresh account+date", () => {
		const result = recordSnapshot([], "acc-1", "2026-01-01", 10000);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ accountId: "acc-1", date: "2026-01-01", balanceCents: 10000 });
		expect(result[0].id).toBeTruthy();
	});

	it("replaces the existing snapshot for the same account+date instead of duplicating", () => {
		const first = recordSnapshot([], "acc-1", "2026-01-01", 10000);
		const result = recordSnapshot(first, "acc-1", "2026-01-01", 12000);
		expect(result).toHaveLength(1);
		expect(result[0].balanceCents).toBe(12000);
		expect(result[0].id).toBe(first[0].id);
	});

	it("keeps snapshots for the same account on different dates distinct", () => {
		const first = recordSnapshot([], "acc-1", "2026-01-01", 10000);
		const result = recordSnapshot(first, "acc-1", "2026-02-01", 11000);
		expect(result).toHaveLength(2);
	});

	it("keeps snapshots for different accounts on the same date distinct", () => {
		const first = recordSnapshot([], "acc-1", "2026-01-01", 10000);
		const result = recordSnapshot(first, "acc-2", "2026-01-01", 5000);
		expect(result).toHaveLength(2);
	});

	it("does not mutate the input array", () => {
		const snapshots: Snapshot[] = [];
		recordSnapshot(snapshots, "acc-1", "2026-01-01", 10000);
		expect(snapshots).toHaveLength(0);
	});
});

describe("netWorthAt", () => {
	it("is zero with no accounts", () => {
		expect(netWorthAt([], [], "2026-01-01")).toBe(0);
	});

	it("is zero for an account with no snapshots yet", () => {
		const accounts = addAccount([], "Checking", "asset");
		expect(netWorthAt(accounts, [], "2026-01-01")).toBe(0);
	});

	it("sums a single asset account's latest balance", () => {
		const accounts = addAccount([], "Checking", "asset");
		const snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 100000);
		expect(netWorthAt(accounts, snapshots, "2026-01-01")).toBe(100000);
	});

	it("subtracts a liability account's latest balance", () => {
		const accounts = addAccount([], "Mortgage", "liability");
		const snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 300000);
		expect(netWorthAt(accounts, snapshots, "2026-01-01")).toBe(-300000);
	});

	it("nets assets and liabilities across multiple accounts", () => {
		let accounts = addAccount([], "Checking", "asset");
		accounts = addAccount(accounts, "Mortgage", "liability");
		let snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 500000);
		snapshots = recordSnapshot(snapshots, accounts[1].id, "2026-01-01", 300000);
		expect(netWorthAt(accounts, snapshots, "2026-01-01")).toBe(200000);
	});

	it("uses the latest snapshot on or before the given date, ignoring later ones", () => {
		const accounts = addAccount([], "Checking", "asset");
		let snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 100000);
		snapshots = recordSnapshot(snapshots, accounts[0].id, "2026-03-01", 150000);
		expect(netWorthAt(accounts, snapshots, "2026-02-01")).toBe(100000);
	});

	it("ignores an account with no snapshot on or before the given date", () => {
		const accounts = addAccount([], "Checking", "asset");
		const snapshots = recordSnapshot([], accounts[0].id, "2026-03-01", 100000);
		expect(netWorthAt(accounts, snapshots, "2026-01-01")).toBe(0);
	});

	it("still counts an archived account's last known balance", () => {
		let accounts = addAccount([], "Old Card", "liability");
		const snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 20000);
		accounts = archiveAccount(accounts, accounts[0].id);
		expect(netWorthAt(accounts, snapshots, "2026-06-01")).toBe(-20000);
	});

	it("reflects a rename with no change to the total (reference by id, not name)", () => {
		const accounts = addAccount([], "Checking", "asset");
		const snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 100000);
		const renamed = renameAccount(accounts, accounts[0].id, "Primary Checking");
		expect(netWorthAt(renamed, snapshots, "2026-01-01")).toBe(100000);
		expect(snapshots[0].accountId).toBe(renamed[0].id);
	});
});

describe("isValidAccountType", () => {
	it("accepts an asset type for kind asset", () => {
		expect(isValidAccountType("asset", "retirement")).toBe(true);
	});

	it("rejects a liability type for kind asset", () => {
		expect(isValidAccountType("asset", "mortgage")).toBe(false);
	});

	it("accepts a liability type for kind liability", () => {
		expect(isValidAccountType("liability", "mortgage")).toBe(true);
	});

	it("rejects an asset type for kind liability", () => {
		expect(isValidAccountType("liability", "retirement")).toBe(false);
	});
});

describe("accountTypeLabel", () => {
	it("returns the display label for a valid kind/type pair", () => {
		expect(accountTypeLabel("asset", "real-estate")).toBe("Real Estate");
	});

	it("returns undefined for a type that doesn't belong to the given kind", () => {
		expect(accountTypeLabel("asset", "mortgage")).toBeUndefined();
	});
});

describe("assetBreakdownByType", () => {
	it("is empty with no accounts", () => {
		expect(assetBreakdownByType([], [], "2026-01-01")).toEqual([]);
	});

	it("groups a single typed account under its type", () => {
		const accounts = addAccount([], "Checking", "asset", "cash");
		const snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 100000);
		expect(assetBreakdownByType(accounts, snapshots, "2026-01-01")).toEqual([
			{ type: "cash", label: "Cash/Bank", totalCents: 100000 },
		]);
	});

	it("sums multiple accounts of the same type into one slice", () => {
		let accounts = addAccount([], "Checking", "asset", "cash");
		accounts = addAccount(accounts, "Savings", "asset", "cash");
		let snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 100000);
		snapshots = recordSnapshot(snapshots, accounts[1].id, "2026-01-01", 50000);
		expect(assetBreakdownByType(accounts, snapshots, "2026-01-01")).toEqual([
			{ type: "cash", label: "Cash/Bank", totalCents: 150000 },
		]);
	});

	it("folds an untyped account into the Other bucket", () => {
		const accounts = addAccount([], "Mystery Fund", "asset");
		const snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 20000);
		expect(assetBreakdownByType(accounts, snapshots, "2026-01-01")).toEqual([
			{ type: "other", label: "Other", totalCents: 20000 },
		]);
	});

	it("merges an untyped account with an explicitly-typed 'other' account", () => {
		let accounts = addAccount([], "Mystery Fund", "asset");
		accounts = addAccount(accounts, "Misc Asset", "asset", "other");
		let snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 20000);
		snapshots = recordSnapshot(snapshots, accounts[1].id, "2026-01-01", 5000);
		expect(assetBreakdownByType(accounts, snapshots, "2026-01-01")).toEqual([
			{ type: "other", label: "Other", totalCents: 25000 },
		]);
	});

	it("excludes liability accounts entirely", () => {
		const accounts = addAccount([], "Mortgage", "liability");
		const snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 300000);
		expect(assetBreakdownByType(accounts, snapshots, "2026-01-01")).toEqual([]);
	});

	it("excludes a type with no balance at the given date", () => {
		const accounts = addAccount([], "Checking", "asset", "cash");
		expect(assetBreakdownByType(accounts, [], "2026-01-01")).toEqual([]);
	});

	it("sorts slices by total descending", () => {
		let accounts = addAccount([], "Checking", "asset", "cash");
		accounts = addAccount(accounts, "House", "asset", "real-estate");
		let snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 50000);
		snapshots = recordSnapshot(snapshots, accounts[1].id, "2026-01-01", 500000);
		expect(assetBreakdownByType(accounts, snapshots, "2026-01-01").map((entry) => entry.type)).toEqual([
			"real-estate",
			"cash",
		]);
	});

	it("still counts an archived account's last known balance, matching netWorthAt", () => {
		let accounts = addAccount([], "Old 401k", "asset", "retirement");
		const snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 40000);
		accounts = archiveAccount(accounts, accounts[0].id);
		expect(assetBreakdownByType(accounts, snapshots, "2026-06-01")).toEqual([
			{ type: "retirement", label: "Retirement", totalCents: 40000 },
		]);
	});

	it("uses the latest snapshot on or before the given date", () => {
		const accounts = addAccount([], "Checking", "asset", "cash");
		let snapshots = recordSnapshot([], accounts[0].id, "2026-01-01", 100000);
		snapshots = recordSnapshot(snapshots, accounts[0].id, "2026-03-01", 150000);
		expect(assetBreakdownByType(accounts, snapshots, "2026-02-01")).toEqual([
			{ type: "cash", label: "Cash/Bank", totalCents: 100000 },
		]);
	});
});

describe("formatCents", () => {
	it("formats a positive amount with two decimals and a dollar sign", () => {
		expect(formatCents(123456)).toBe("$1,234.56");
	});

	it("formats zero", () => {
		expect(formatCents(0)).toBe("$0.00");
	});

	it("formats a negative amount with the sign before the dollar sign", () => {
		expect(formatCents(-123456)).toBe("-$1,234.56");
	});
});
