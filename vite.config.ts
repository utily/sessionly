import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		typecheck: {
			tsconfig: "./tsconfig.json",
		},
		coverage: {
			reporter: ["text", "json", "html"],
			enabled: true,
			all: true,
			cleanOnRerun: true,
			thresholds: {
				statements: 70,
				branches: 70,
				functions: 70,
				lines: 70,
			},
		},
		globals: true,
		include: ["**/*.spec.[tj]s"],
		testTimeout: 20000,
		isolate: false,
		exclude: ["node_modules", "dist"],
		server: {
			deps: {
				inline: [
					"authly",
					"isly",
					"typedly",
					"cloudly-analytics",
					"cryptly",
					"isoly",
					"cloudly-http",
					"sessionly",
					"flagly",
					"cloudly-storage",
					"cloudly-rest",
					"tidily",
					"gracely",
					"cloudly-router",
					"selectively",
					"langly",
				],
			},
		},
	},
})
