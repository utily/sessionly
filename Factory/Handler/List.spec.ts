import { sessionly } from "../../index"

async function contextSwitch(): Promise<void> {
	return await new Promise(resolve => setTimeout(resolve, 0))
}
interface State {
	sum?: number
	numbers: sessionly.List<number>
	double: sessionly.List<number>
	square: sessionly.List<number>
}

function create(blocking: boolean): sessionly.Object<State> {
	const factory = sessionly.Factory.create<sessionly.Object<State>>()
	const state = factory.create<State>(
		"object",
		{
			sum: {
				load: async ({ me }) => {
					if (blocking)
						await contextSwitch()
					return me.numbers.reduce((result, number) => result + number, 0)
				},
				reload: ["numbers.change"],
			},
		},
		{
			sum: undefined,
			numbers: factory.create<number>(
				"list",
				{
					load: async () => {
						if (blocking)
							await contextSwitch()
						return [0, 1, 2]
					},
				},
				undefined
			),
			double: factory.create<number>(
				"list",
				{
					load: async ({ state }) => {
						if (blocking)
							await contextSwitch()
						return state?.numbers.map(number => number * 2)
					},
					reload: ["numbers.change"],
				},
				undefined
			),
			square: factory.create<number>(
				"list",
				{
					load: async ({ state }) => {
						if (blocking)
							await contextSwitch()
						const numbers = state?.numbers.toArray()
						const result = numbers?.map(number => number * number)
						return result
					},
					invalidate: ["numbers.change"],
					reload: ["numbers.change"],
				},
				undefined
			),
		}
	)
	return factory.start(state)
}

describe("Factory.Handler.List", () => {
	it("reload", async () => {
		const state = create(true)
		expect(state.numbers.toArray()).toEqual([])
		expect(state.sum).toEqual(undefined)
		await contextSwitch()
		expect(state.numbers.toArray()).toEqual([0, 1, 2])
		expect(state.sum).toEqual(undefined)
		expect(state.double.toArray()).toEqual([])
		expect(state.square.toArray()).toEqual([])
		await contextSwitch()
		expect(state.double.toArray()).toEqual([0, 2, 4])
		expect(state.square.toArray()).toEqual([0, 1, 4])
		expect(state.sum).toEqual(3)
		state.numbers.change([1, 2, 3])
		expect(state.numbers.toArray()).toEqual([0, 1, 2])
		expect(state.double.toArray()).toEqual([0, 2, 4])
		expect(state.square.toArray()).toEqual([0, 1, 4])
		await contextSwitch()
		expect(state.numbers.toArray()).toEqual([1, 2, 3])
		expect(state.square.toArray()).toEqual([])
		expect(state.double.toArray()).toEqual([0, 2, 4])
		expect(state.sum).toEqual(3)
		await contextSwitch()
		expect(state.double.toArray()).toEqual([2, 4, 6])
		expect(state.square.toArray()).toEqual([1, 4, 9])
		expect(state.sum).toEqual(6)
	})
	it("reload + invalidate", async () => {
		const state = create(false)
		expect(state.sum).toEqual(undefined)
		await contextSwitch()
		expect(state.sum).toEqual(3)
		expect(state.numbers.toArray()).toEqual([0, 1, 2])
		expect(state.double.toArray()).toEqual([])
		expect(state.square.toReversed()).toEqual([])
		await contextSwitch()
		expect(state.double.toArray()).toEqual([0, 2, 4])
		expect(state.square.toArray()).toEqual([0, 1, 4])
		state.numbers.invalidate()
		expect(state.numbers.toArray()).toEqual([])
		expect(state.double.toArray()).toEqual([0, 2, 4])
		expect(state.square.toArray()).toEqual([])
		await contextSwitch()
	})
	it("blocking reload + invalidate", async () => {
		const state = create(true)
		expect(state.sum).toEqual(undefined)
		await contextSwitch()
		await contextSwitch()
		await contextSwitch()
		expect(state.sum).toEqual(3)
		expect(state.numbers.toArray()).toEqual([0, 1, 2])
		expect(state.double.toArray()).toEqual([])
		expect(state.square.toReversed()).toEqual([])
		await contextSwitch()
		expect(state.double.toArray()).toEqual([0, 2, 4])
		expect(state.square.toArray()).toEqual([0, 1, 4])
		state.numbers.invalidate()
		expect(state.numbers.toArray()).toEqual([])
		expect(state.double.toArray()).toEqual([0, 2, 4])
		expect(state.square.toArray()).toEqual([])
		await contextSwitch()
	})
})
