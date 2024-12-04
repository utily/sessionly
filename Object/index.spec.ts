import { sessionly } from "../index"

async function contextSwitch(): Promise<void> {
	return await new Promise(resolve => setTimeout(resolve, 0))
}
interface State {
	sum?: number
	left: sessionly.Object<Number>
	right: sessionly.Object<Number>
}
interface Number {
	previous?: number
	value?: number
	double?: number
}

describe("Object", () => {
	it("configuration", () => {
		type NumberConfiguration = sessionly.Object.Configuration<Number, sessionly.Object<State>>
		type StateConfiguration = sessionly.Object.Configuration<State, sessionly.Object<State>>
		const left: NumberConfiguration = {
			value: {
				load: async ({ me, current }) => {
					me.previous = current
					return current ?? 0
				},
			},
			double: {
				load: async ({ me }) => {
					return (me.value ?? 0) * 2
				},
				reload: ["left.value"],
			},
		}
		const right: NumberConfiguration = {
			value: {
				load: async ({ me, current }) => {
					me.previous = current
					return current ?? 0
				},
			},
			double: {
				load: async ({ me }) => {
					return (me.value ?? 0) * 2
				},
				reload: ["right.value"],
			},
		}
		const state: StateConfiguration = {
			sum: {
				load: async ({ state }) => {
					const result = !state?.left.value || !state.right.value ? undefined : state.left.value + state.right.value
					return result
				},
				reload: ["left.value", "right.value"],
			},
		}
		expect(left).toBeTruthy()
		expect(right).toBeTruthy()
		expect(state).toBeTruthy()
	})
	it("create + is", async () => {
		const state = sessionly.Object.create<Number>({}, { value: 0 })
		expect(sessionly.Object.is(state)).toEqual(true)
		expect(sessionly.Object.is({ value: 0 })).toEqual(false)
	})
	it("load", async () => {
		const states = {
			loaded: sessionly.Object.create<Number>(
				{
					value: {
						load: async ({ current }) => {
							await contextSwitch()
							// its expected for this function to not run in this test
							expect(true).toEqual(false)
							return current
						},
					},
				},
				{ value: 0 }
			),
			unloaded: sessionly.Object.create<Number>(
				{
					value: {
						load: async () => {
							await contextSwitch()
							return 0
						},
					},
				},
				{}
			),
		}
		expect(states.loaded.value).toEqual(0)
		await contextSwitch()
		expect(states.loaded.value).toEqual(0)

		expect(states.unloaded.value).toEqual(undefined)
		await contextSwitch()
		expect(states.unloaded.value).toEqual(0)
	})
	it("initiate", async () => {
		const states = {
			initiated: sessionly.Object.create<Number>(
				{
					value: {
						initiate: () => {
							return 0
						},
						load: async () => {
							await contextSwitch()
							return 1
						},
					},
				},
				{}
			),
		}
		// 2 get accesses to value to make sure nothing sync is changing between gets
		expect(states.initiated.value).toEqual(0)
		expect(states.initiated.value).toEqual(0)
		await contextSwitch()
		expect(states.initiated.value).toEqual(1)
	})
	it("store", async () => {
		const state = sessionly.Object.create<Number>(
			{
				value: {
					store: async ({ value }) => {
						await contextSwitch()
						return value
					},
				},
			},
			{ value: 0 }
		)
		expect(state.value).toEqual(0)
		state.value = 1
		expect(state.value).toEqual(0)
		await contextSwitch()
		expect(state.value).toEqual(1)
	})
	it("readonly", async () => {
		const state = sessionly.Object.create<Number>(
			{
				value: { readonly: true },
			},
			{ value: 1 }
		)
		expect(state.value).toEqual(1)
		try {
			state.value = 2
			// expecting assignment above to fail
			expect(true).toEqual(false)
		} catch (e) {
			expect(e).toBeTruthy()
		}
		await contextSwitch()
		expect(state.value).toEqual(1)
	})
	it("listen", async () => {
		const factory = () =>
			sessionly.Object.create<Number>(
				{
					value: {
						load: async () => {
							await contextSwitch()
							return 1
						},
					},
				},
				{}
			)
		const states = {
			passive: { read: factory(), write: factory() },
			active: { write: factory(), read: factory() },
		}
		const values: { passive: { read: unknown[]; write: unknown[] }; active: { read: unknown[]; write: unknown[] } } = {
			active: { read: [], write: [] },
			passive: { read: [], write: [] },
		}
		states.passive.read.listen("value", value => values.passive.read.push(value), { passive: true, trigger: "read" })
		states.passive.write.listen("value", value => values.passive.write.push(value), { passive: true })
		states.active.read.listen("value", value => values.active.read.push(value), { trigger: "read" })
		states.active.write.listen("value", value => values.active.write.push(value))

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
		const state = sessionly.Object.create<Number>({}, { value: 1 })
		const calls = { value: 0 }
		state.listen("value", () => calls.value++, { passive: true })
		await contextSwitch()
		expect(calls).toEqual({ value: 0 })
		expect(state.value).toEqual(1)
		delete state.value
		expect(state.value).toEqual(undefined)
		expect(calls).toEqual({ value: 1 })
	})
})
