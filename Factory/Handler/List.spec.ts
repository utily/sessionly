import { sessionly } from "../../index"

async function contextSwitch(): Promise<void> {
	return await new Promise(resolve => setTimeout(resolve, 0))
}
interface Session {
	sum?: number
	numbers: sessionly.List<number>
	double: sessionly.List<number>
	square: sessionly.List<number>
}

function create(blocking: boolean): sessionly.Object<Session> {
	const factory = sessionly.Factory.create<sessionly.Object<Session>>()
	const session = factory.create<Session>(
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
					load: async ({ session }) => {
						if (blocking)
							await contextSwitch()
						return session?.numbers.map(number => number * 2)
					},
					reload: ["numbers.change"],
				},
				undefined
			),
			square: factory.create<number>(
				"list",
				{
					load: async ({ session }) => {
						if (blocking)
							await contextSwitch()
						const numbers = session?.numbers.toArray()
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
	return factory.start(session)
}

describe("Factory.Handler.List", () => {
	it("reload", async () => {
		const session = create(true)
		expect(session.numbers.toArray()).toEqual([])
		expect(session.sum).toEqual(undefined)
		await contextSwitch()
		expect(session.numbers.toArray()).toEqual([0, 1, 2])
		expect(session.sum).toEqual(undefined)
		expect(session.double.toArray()).toEqual([])
		expect(session.square.toArray()).toEqual([])
		await contextSwitch()
		expect(session.double.toArray()).toEqual([0, 2, 4])
		expect(session.square.toArray()).toEqual([0, 1, 4])
		expect(session.sum).toEqual(3)
		session.numbers.change([1, 2, 3])
		expect(session.numbers.toArray()).toEqual([0, 1, 2])
		expect(session.double.toArray()).toEqual([0, 2, 4])
		expect(session.square.toArray()).toEqual([0, 1, 4])
		await contextSwitch()
		expect(session.numbers.toArray()).toEqual([1, 2, 3])
		expect(session.square.toArray()).toEqual([])
		expect(session.double.toArray()).toEqual([0, 2, 4])
		expect(session.sum).toEqual(3)
		await contextSwitch()
		expect(session.double.toArray()).toEqual([2, 4, 6])
		expect(session.square.toArray()).toEqual([1, 4, 9])
		expect(session.sum).toEqual(6)
	})
	it("reload + invalidate", async () => {
		const session = create(false)
		expect(session.sum).toEqual(undefined)
		await contextSwitch()
		expect(session.sum).toEqual(3)
		expect(session.numbers.toArray()).toEqual([0, 1, 2])
		expect(session.double.toArray()).toEqual([])
		expect(session.square.toReversed()).toEqual([])
		await contextSwitch()
		expect(session.double.toArray()).toEqual([0, 2, 4])
		expect(session.square.toArray()).toEqual([0, 1, 4])
		session.numbers.invalidate()
		expect(session.numbers.toArray()).toEqual([])
		expect(session.double.toArray()).toEqual([0, 2, 4])
		expect(session.square.toArray()).toEqual([])
		await contextSwitch()
	})
	it("blocking reload + invalidate", async () => {
		const session = create(true)
		expect(session.sum).toEqual(undefined)
		await contextSwitch()
		await contextSwitch()
		await contextSwitch()
		expect(session.sum).toEqual(3)
		expect(session.numbers.toArray()).toEqual([0, 1, 2])
		expect(session.double.toArray()).toEqual([])
		expect(session.square.toReversed()).toEqual([])
		await contextSwitch()
		expect(session.double.toArray()).toEqual([0, 2, 4])
		expect(session.square.toArray()).toEqual([0, 1, 4])
		session.numbers.invalidate()
		expect(session.numbers.toArray()).toEqual([])
		expect(session.double.toArray()).toEqual([0, 2, 4])
		expect(session.square.toArray()).toEqual([])
		await contextSwitch()
	})
})
