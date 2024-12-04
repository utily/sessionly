import { sessionly } from "../index"

async function contextSwitch(): Promise<void> {
	return await new Promise(resolve => setTimeout(resolve, 0))
}
interface State {
	sum?: number
	numbers: sessionly.Record<Numbers>
}
type Numbers = Record<string, number>

describe("Record", () => {
	it("Configuration", () => {
		type StateConfiguration = sessionly.Object.Configuration<State, sessionly.Object<State>>
		type NumbersConfiguration = sessionly.Record.Configuration<sessionly.Record<Numbers>, sessionly.Record<State>>
		const numbers: NumbersConfiguration = {
			load: async ({ current }) => {
				return current ?? 0
			},
		}
		const state: StateConfiguration = {
			sum: {
				load: async ({ state }) => {
					await contextSwitch()
					return sessionly.Record.values(state?.numbers).reduce<number>((result, number) => result + (number ?? 0), 0)
				},
				reload: ["numbers.*"],
			},
		}
		expect(numbers).toBeTruthy()
		expect(state).toBeTruthy()
	})
	it("create + is", async () => {
		const state = sessionly.Record.create<Numbers>({}, { a: 0, b: 1 })
		expect(sessionly.Record.is(state)).toEqual(true)
		expect(sessionly.Record.is({ a: 0, b: 1 })).toEqual(false)
	})
	it("load", async () => {
		const states = {
			loaded: sessionly.Record.create<Numbers>(
				{
					load: async ({ current }) => {
						await contextSwitch()
						// its expected for this function to not run in this test
						expect(true).toEqual(false)
						return current
					},
				},
				{ a: 0 }
			),
			unloaded: sessionly.Record.create<Numbers>(
				{
					load: async () => {
						await contextSwitch()
						return 0
					},
				},
				{}
			),
		}
		// 2 get accesses to value to make sure nothing sync is changing between gets
		expect(states.loaded.a).toEqual(0)
		expect(states.loaded.a).toEqual(0)
		await contextSwitch()
		expect(states.loaded.a).toEqual(0)

		// 2 get accesses to value to make sure nothing sync is changing between gets
		expect(states.unloaded.a).toEqual(undefined)
		expect(states.unloaded.a).toEqual(undefined)
		await contextSwitch()
		expect(states.unloaded.a).toEqual(0)
	})
	it("initiate", async () => {
		const states = {
			initiated: sessionly.Record.create<Numbers>(
				{
					initiate: () => {
						return 0
					},
					load: async () => {
						await contextSwitch()
						return 1
					},
				},
				{}
			),
		}
		// 2 get accesses to value to make sure nothing sync is changing between gets
		expect(states.initiated.a).toEqual(0)
		expect(states.initiated.a).toEqual(0)
		await contextSwitch()
		expect(states.initiated.a).toEqual(1)
	})
	it("store", async () => {
		const state = sessionly.Record.create<Numbers>(
			{
				store: async ({ value }) => {
					await contextSwitch()
					return value
				},
			},
			{ a: 0 }
		)
		expect(state.a).toEqual(0)
		state.a = 1
		expect(state.a).toEqual(0)
		await contextSwitch()
		expect(state.a).toEqual(1)
	})
	it("readonly", async () => {
		const state = sessionly.Record.create<Numbers>({ readonly: true }, { a: 1 })
		expect(state.a).toEqual(1)
		try {
			state.a = 2
			expect(true).toEqual(false)
		} catch (e) {
			expect(e).toBeTruthy()
		}
		await contextSwitch()
		expect(state.a).toEqual(1)
	})
	it("listen", async () => {
		const factory = () =>
			sessionly.Record.create<Numbers>(
				{
					load: async () => {
						await contextSwitch()
						return 1
					},
				},
				{}
			)
		const states = {
			passive: { read: factory(), write: factory() },
			active: { read: factory(), write: factory() },
		}
		const values: { passive: { read: unknown[]; write: unknown[] }; active: { read: unknown[]; write: unknown[] } } = {
			active: { read: [], write: [] },
			passive: { read: [], write: [] },
		}
		states.passive.read.listen("value", value => values.passive.read.push(value), { passive: true, trigger: "read" })
		states.passive.write.listen("value", value => values.passive.write.push(value), { passive: true })
		states.active.read.listen("value", value => values.active.read.push(value), { trigger: "read" })
		states.active.write.listen("value", value => values.active.write.push(value), { trigger: "write" })

		expect(values.passive.read).toEqual([])
		expect(values.passive.read.length).toEqual(0)
		expect(values.passive.write).toEqual([])
		expect(values.passive.write.length).toEqual(0)
		expect(values.active.read).toEqual([undefined, undefined, undefined])
		expect(values.active.read.length).toEqual(3)
		expect(values.active.write).toEqual([undefined])
		expect(values.active.write.length).toEqual(1)
		await contextSwitch()
		expect(values.passive.read).toEqual([])
		expect(values.passive.read.length).toEqual(0)
		expect(values.passive.write).toEqual([])
		expect(values.passive.write.length).toEqual(0)
		expect(values.active.read).toEqual([undefined, undefined, undefined])
		expect(values.active.read.length).toEqual(3)
		expect(values.active.write).toEqual([undefined, 1])
		expect(values.active.write.length).toEqual(2)

		expect(states.passive.read.value).toEqual(undefined)
		expect(states.passive.write.value).toEqual(undefined)
		expect(states.active.read.value).toEqual(1)
		expect(states.active.write.value).toEqual(1)
		await contextSwitch()
		expect(values.passive.read).toEqual([undefined])
		expect(values.passive.read.length).toEqual(1)
		expect(values.passive.write).toEqual([1])
		expect(values.passive.write.length).toEqual(1)
		expect(values.active.read).toEqual([undefined, undefined, undefined, 1])
		expect(values.active.read.length).toEqual(4)
		expect(values.active.write).toEqual([undefined, 1])
		expect(values.active.write.length).toEqual(2)

		expect(states.passive.read.value).toEqual(1)
		expect(states.passive.write.value).toEqual(1)
		expect(states.active.read.value).toEqual(1)
		expect(states.active.write.value).toEqual(1)
		await contextSwitch()
		expect(values.passive.read).toEqual([undefined, 1])
		expect(values.passive.read.length).toEqual(2)
		expect(values.passive.write).toEqual([1])
		expect(values.passive.write.length).toEqual(1)
		expect(values.active.read).toEqual([undefined, undefined, undefined, 1, 1])
		expect(values.active.read.length).toEqual(5)
		expect(values.active.write).toEqual([undefined, 1])
		expect(values.active.write.length).toEqual(2)

		expect(states.passive.read.value).toEqual(1)
		expect(states.passive.write.value).toEqual(1)
		expect(states.active.read.value).toEqual(1)
		expect(states.active.write.value).toEqual(1)
		await contextSwitch()
		expect(values.passive.read).toEqual([undefined, 1, 1])
		expect(values.passive.read.length).toEqual(3)
		expect(values.passive.write).toEqual([1])
		expect(values.passive.write.length).toEqual(1)
		expect(values.active.read).toEqual([undefined, undefined, undefined, 1, 1, 1])
		expect(values.active.read.length).toEqual(6)
		expect(values.active.write).toEqual([undefined, 1])
		expect(values.active.write.length).toEqual(2)
	})
	it("delete", async () => {
		const state = sessionly.Record.create<Numbers>({}, { value: 1 })
		const calls = { value: 0, "*": 0 }
		state.listen("value", () => calls.value++, { passive: true })
		state.listen("*", () => calls["*"]++, { passive: true })
		await contextSwitch()
		expect(calls).toEqual({ value: 0, "*": 0 })
		expect(state.value).toEqual(1)
		delete state.value
		expect(state.value).toEqual(undefined)
		expect(calls).toEqual({ value: 1, "*": 1 })
	})
})
