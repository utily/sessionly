import { sessionly } from "../index"

async function contextSwitch(): Promise<void> {
	return await new Promise(resolve => setTimeout(resolve, 0))
}
interface State {
	sum?: number
	numbers: sessionly.List<number>
	double: sessionly.List<number>
}

describe("List", () => {
	it("configuration", async () => {
		type StateConfiguration = sessionly.Object.Configuration<State, sessionly.Object<State>>
		type NumbersConfiguration = sessionly.List.Configuration<number, sessionly.Object<State>>
		const numbers: NumbersConfiguration = {
			load: async ({ current }) => {
				return current ?? []
			},
		}
		const double: NumbersConfiguration = {
			load: async ({ state }) => {
				return state?.numbers.reduce<number[]>((result, number) => result.concat(number, number), [])
			},
			reload: ["numbers.change"],
		}
		const state: StateConfiguration = {
			sum: {
				load: async ({ me }) => {
					return me.double.reduce(
						(result, number) => result + number,
						me.numbers.reduce((result, number) => result + number, 0)
					)
				},
				reload: ["numbers.change", "double.change"],
			},
		}
		expect(numbers).toBeTruthy()
		expect(double).toBeTruthy()
		expect(state).toBeTruthy()
	})
	it("create + is", () => {
		const state = sessionly.List.create<number>({}, [0, 1, 2])
		expect(sessionly.List.is(state)).toEqual(true)
		expect(sessionly.List.is([0, 1, 2])).toEqual(false)
	})
	it("load", async () => {
		const states = {
			loaded: sessionly.List.create<number>(
				{
					load: async ({ current }) => {
						await contextSwitch()
						expect(true).toEqual(false)
						return current
					},
				},
				[0, 1, 2]
			),
			unloaded: sessionly.List.create<number>(
				{
					load: async () => {
						await contextSwitch()
						return [0, 1, 2]
					},
				},
				undefined
			),
		}
		expect(states.loaded.toArray()).toEqual([0, 1, 2])
		expect(states.loaded.toArray()).toEqual([0, 1, 2])
		await contextSwitch()
		expect(states.loaded.toArray()).toEqual([0, 1, 2])

		expect(states.unloaded.toArray()).toEqual([])
		expect(states.unloaded.toArray()).toEqual([])
		await contextSwitch()
		expect(states.unloaded.toArray()).toEqual([0, 1, 2])
	})
	it("initiate", async () => {
		const states = {
			initiated: sessionly.List.create<number>(
				{
					initiate: () => {
						return [0]
					},
					load: async () => {
						await contextSwitch()
						return [1]
					},
				},
				undefined
			),
		}
		expect(states.initiated.toArray()).toEqual([0])
		expect(states.initiated.toArray()).toEqual([0])
		await contextSwitch()
		expect(states.initiated.toArray()).toEqual([1])
	})
	it("change", async () => {
		const state = sessionly.List.create<number>(
			{
				change: async ({ value }) => {
					await contextSwitch()
					return value
				},
			},
			[]
		)
		expect(state.toArray()).toEqual([])
		state.change([0, 1, 2])
		expect(state.toArray()).toEqual([])
		await contextSwitch()
		await contextSwitch()
		expect(state.toArray()).toEqual([0, 1, 2])
	})
	it("listen", async () => {
		const factory = () =>
			sessionly.List.create<number>(
				{
					load: async () => {
						await contextSwitch()
						return [1]
					},
				},
				undefined
			)
		const states = {
			passive: { read: factory(), write: factory() },
			active: { read: factory(), write: factory() },
		}
		const values: { passive: { read: unknown[]; write: unknown[] }; active: { read: unknown[]; write: unknown[] } } = {
			active: { read: [], write: [] },
			passive: { read: [], write: [] },
		}
		states.passive.read.listen("read", value => values.passive.read.push(value.length), { passive: true })
		states.passive.write.listen("change", value => values.passive.write.push(value.length), { passive: true })
		states.active.read.listen("read", value => values.active.read.push(value.length))
		states.active.write.listen("change", value => values.active.write.push(value.length))

		expect(values.passive.read).toEqual([])
		expect(values.passive.read.length).toEqual(0)
		expect(values.passive.write).toEqual([])
		expect(values.passive.write.length).toEqual(0)
		expect(values.active.read).toEqual([0])
		expect(values.active.read.length).toEqual(1)
		expect(values.active.write).toEqual([0])
		expect(values.active.write.length).toEqual(1)
		await contextSwitch()
		expect(values.passive.read).toEqual([])
		expect(values.passive.read.length).toEqual(0)
		expect(values.passive.write).toEqual([])
		expect(values.passive.write.length).toEqual(0)
		expect(values.active.read).toEqual([0])
		expect(values.active.read.length).toEqual(1)
		expect(values.active.write).toEqual([0, 1])
		expect(values.active.write.length).toEqual(2)

		expect(states.passive.read.toArray()).toEqual([])
		expect(states.passive.write.toArray()).toEqual([])
		expect(states.active.read.toArray()).toEqual([1])
		expect(states.active.write.toArray()).toEqual([1])
		await contextSwitch()
		expect(values.passive.read).toEqual([0])
		expect(values.passive.read.length).toEqual(1)
		expect(values.passive.write).toEqual([1])
		expect(values.passive.write.length).toEqual(1)
		expect(values.active.read).toEqual([0, 1])
		expect(values.active.read.length).toEqual(2)
		expect(values.active.write).toEqual([0, 1])
		expect(values.active.write.length).toEqual(2)

		expect(states.passive.read.toArray()).toEqual([1])
		expect(states.passive.write.toArray()).toEqual([1])
		expect(states.active.read.toArray()).toEqual([1])
		expect(states.active.write.toArray()).toEqual([1])
		await contextSwitch()
		expect(values.passive.read).toEqual([0, 1])
		expect(values.passive.read.length).toEqual(2)
		expect(values.passive.write).toEqual([1])
		expect(values.passive.write.length).toEqual(1)
		expect(values.active.read).toEqual([0, 1, 1])
		expect(values.active.read.length).toEqual(3)
		expect(values.active.write).toEqual([0, 1])
		expect(values.active.write.length).toEqual(2)
	})
})
