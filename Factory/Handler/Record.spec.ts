import { sessionly } from "../../index"

async function contextSwitch(): Promise<void> {
	return await new Promise(resolve => setTimeout(resolve, 0))
}
interface State {
	sum?: number
	numbers: sessionly.Record<Numbers>
	double: sessionly.Record<Numbers>
	half: sessionly.Record<Numbers>
}
type Numbers = Record<string, number>

function create(blocking: boolean): sessionly.Object<State> {
	const factory = sessionly.Factory.create<sessionly.Object<State>>()
	const state = factory.create<State>(
		"object",
		{
			sum: {
				load: async ({ state }) => {
					if (blocking)
						await contextSwitch()
					return sessionly.Record.values(state?.numbers).reduce<number>((result, number) => result + number, 0)
				},
				reload: ["numbers.*"],
			},
		},
		{
			sum: undefined,
			double: factory.create<Numbers>(
				"record",
				{
					load: async ({ state, property }) => {
						if (blocking)
							await contextSwitch()
						const value = state?.numbers?.[property[0]]
						return value == undefined ? undefined : value * 2
					},
					reload: ["numbers.*"],
				},
				{}
			),
			half: factory.create<Numbers>(
				"record",
				{
					load: async ({ state, property }) => {
						if (blocking)
							await contextSwitch()
						const value = state?.numbers?.[property[0]]
						return value == undefined ? undefined : value / 2
					},
					invalidate: ["numbers.*"],
					reload: ["numbers.*"],
				},
				{}
			),
			numbers: factory.create<Numbers>(
				"record",
				{
					load: async ({ property }) => {
						const code = property.charCodeAt(0)
						const start = "a".charCodeAt(0)
						const end = "z".charCodeAt(0)
						return code === undefined || !(start <= code && code <= end) ? undefined : code - start
					},
				},
				{}
			),
		}
	)
	return factory.start(state)
}

describe("Factory.handler.Record", () => {
	it("reload", async () => {
		const state = create(true)
		expect(state.numbers.a).toEqual(undefined)
		expect(state.numbers.b).toEqual(undefined)
		expect(state.numbers.c).toEqual(undefined)
		expect(state.double.c).toEqual(undefined)
		expect(state.sum).toEqual(undefined)
		await contextSwitch()
		expect(state.numbers.a).toEqual(0)
		expect(state.numbers.b).toEqual(1)
		expect(state.numbers.c).toEqual(2)
		expect(state.double.c).toEqual(undefined)
		expect(state.sum).toEqual(undefined)
		await contextSwitch()
		expect(state.sum).toEqual(3)
		state.numbers.c = 6
		expect(state.numbers.a).toEqual(0)
		expect(state.numbers.b).toEqual(1)
		expect(state.numbers.c).toEqual(2)
		expect(state.double.c).toEqual(4)
		expect(state.sum).toEqual(3)
		await contextSwitch()
		expect(state.numbers.a).toEqual(0)
		expect(state.numbers.b).toEqual(1)
		expect(state.numbers.c).toEqual(6)
		expect(state.double.c).toEqual(4)
		expect(state.sum).toEqual(3)
		await contextSwitch()
		expect(state.sum).toEqual(7)
		expect(state.double.c).toEqual(12)
	})
	it("reload + invalidate", async () => {
		const state = create(false)
		expect(state.numbers.b).toEqual(undefined)
		expect(state.numbers.c).toEqual(undefined)
		expect(state.double.cd).toEqual(undefined)
		expect(state.half.ch).toEqual(undefined)
		expect(state.sum).toEqual(undefined)
		await contextSwitch()
		expect(state.numbers.b).toEqual(1)
		expect(state.numbers.c).toEqual(2)
		expect(state.double.cd).toEqual(4)
		expect(state.half.ch).toEqual(1)
		expect(state.sum).toEqual(3)
		await contextSwitch()
		expect(state.double.cd).toEqual(4)
		expect(state.half.ch).toEqual(1)
		expect(state.sum).toEqual(3)
		await contextSwitch()
		delete state.numbers.c
		expect(state.numbers.c).toEqual(undefined)
		expect(state.double.cd).toEqual(4)
		expect(state.half.ch).toEqual(undefined)
		expect(state.sum).toEqual(3)
		await contextSwitch()
		expect(state.numbers.c).toEqual(2)
		expect(state.double.cd).toEqual(4)
		expect(state.half.ch).toEqual(1)
		expect(state.sum).toEqual(3)
		await contextSwitch()
		expect(state.numbers.c).toEqual(2)
		expect(state.double.cd).toEqual(4)
		expect(state.half.ch).toEqual(1)
		expect(state.sum).toEqual(3)
	})
	it("blocking reload + invalidate", async () => {
		const state = create(true)
		expect(state.numbers.b).toEqual(undefined)
		expect(state.numbers.c).toEqual(undefined)
		expect(state.double.cd).toEqual(undefined)
		expect(state.half.ch).toEqual(undefined)
		expect(state.sum).toEqual(undefined)
		await contextSwitch()
		expect(state.numbers.b).toEqual(1)
		expect(state.numbers.c).toEqual(2)
		expect(state.double.cd).toEqual(undefined)
		expect(state.half.ch).toEqual(undefined)
		expect(state.sum).toEqual(undefined)
		await contextSwitch()
		expect(state.double.cd).toEqual(4)
		expect(state.half.ch).toEqual(1)
		expect(state.sum).toEqual(3)
		await contextSwitch()
		delete state.numbers.c
		expect(state.numbers.c).toEqual(undefined)
		expect(state.double.cd).toEqual(4)
		expect(state.half.ch).toEqual(undefined)
		expect(state.sum).toEqual(3)
		await contextSwitch()
		expect(state.numbers.c).toEqual(2)
		expect(state.double.cd).toEqual(4)
		expect(state.half.ch).toEqual(undefined)
		expect(state.sum).toEqual(3)
		await contextSwitch()
		expect(state.numbers.c).toEqual(2)
		expect(state.double.cd).toEqual(4)
		expect(state.half.ch).toEqual(1)
		expect(state.sum).toEqual(3)
	})
})
