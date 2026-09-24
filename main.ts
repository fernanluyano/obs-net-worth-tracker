import { Notice, Plugin } from "obsidian";
import { greet } from "./hello";

export default class NetWorthTrackerPlugin extends Plugin {
	async onload(): Promise<void> {
		this.addRibbonIcon("wallet", "Net Worth Tracker", () => {
			new Notice(greet("there"));
		});

		this.addCommand({
			id: "say-hello",
			name: "Say hello",
			callback: () => {
				new Notice(greet("there"));
			},
		});
	}
}
