// Hand-maintained "What's new" copy, one entry per released version — same
// manual-upkeep approach as docs.ts. Add a new entry (newest first) whenever
// a version is released via `make release`; nothing here bumps itself.
export interface ChangelogEntry {
	version: string;
	highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
	{
		version: "0.1.0",
		highlights: ["🎉 Initial release — hello world"],
	},
];

export function getChangelogEntry(version: string): ChangelogEntry | undefined {
	return CHANGELOG.find((e) => e.version === version);
}
