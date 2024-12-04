import { sessionly } from "../index"

type Events = { create: [value: number, event: "create"]; delete: [value: number, event: "delete"] }

describe("Listenable", () => {
	it("default", async () => {
		const listeners = sessionly.Listenable.Listeners.create<Events>()
		const calls: { [Event in keyof Events]: number[] } = {
			create: [],
			delete: [],
		}
		listeners.add("create", (value, event) => calls[event].push(value))
		listeners.add("delete", (value, event) => calls[event].push(value))
		expect(calls).toEqual({ create: [], delete: [] })
		listeners.call("create", "write", 1, "create")
		expect(calls).toEqual({ create: [1], delete: [] })
		listeners.call("delete", "write", 1, "delete")
		expect(calls).toEqual({ create: [1], delete: [1] })
		listeners.call("create", "read", 2, "create")
		listeners.call("delete", "read", 2, "delete")
		expect(calls).toEqual({ create: [1], delete: [1] })
	})
	it("read", () => {
		const listeners = sessionly.Listenable.Listeners.create<Events>()
		const calls: { [Event in keyof Events]: number[] } = {
			create: [],
			delete: [],
		}
		listeners.add("create", (value, event) => calls[event].push(value), { trigger: "read" })
		listeners.add("delete", (value, event) => calls[event].push(value), { trigger: "read" })
		expect(calls).toEqual({ create: [], delete: [] })
		listeners.call("create", "read", 1, "create")
		expect(calls).toEqual({ create: [1], delete: [] })
		listeners.call("delete", "read", 1, "delete")
		expect(calls).toEqual({ create: [1], delete: [1] })
		listeners.call("create", "write", 2, "create")
		listeners.call("delete", "write", 2, "delete")
		expect(calls).toEqual({ create: [1], delete: [1] })
	})
	it("once", () => {
		const listeners = sessionly.Listenable.Listeners.create<Events>()
		const calls: { [Event in keyof Events]: number[] } = {
			create: [],
			delete: [],
		}
		listeners.add("create", (value, event) => calls[event].push(value), { once: true })
		listeners.add("delete", (value, event) => calls[event].push(value), { once: true })
		expect(calls).toEqual({ create: [], delete: [] })
		listeners.call("create", "write", 1, "create")
		expect(calls).toEqual({ create: [1], delete: [] })
		listeners.call("delete", "write", 1, "delete")
		expect(calls).toEqual({ create: [1], delete: [1] })
		listeners.call("create", "write", 2, "create")
		listeners.call("delete", "write", 2, "delete")
		expect(calls).toEqual({ create: [1], delete: [1] })
	})
})
