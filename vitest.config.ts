import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["*.ts"],
			// main.ts/view.ts drive the Obsidian API directly and aren't unit
			// tested per this project's convention (see CLAUDE.md) — only pure
			// logic modules are expected to carry coverage.
			exclude: ["main.ts", "view.ts", "*.config.ts"],
			thresholds: {
				lines: 50,
				statements: 50,
				functions: 50,
				branches: 50,
			},
		},
	},
});
