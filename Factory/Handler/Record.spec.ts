import { sessionly } from "../../index"

async function contextSwitch(): Promise<void> {
	return await new Promise(resolve => setTimeout(resolve, 0))
}
interface Session {
	sum?: number
	numbers: sessionly.Record<Numbers>
	double: sessionly.Record<Numbers>
	half: sessionly.Record<Numbers>
}
type Numbers = Record<string, number>

function create(blocking: boolean): sessionly.Object<Session> {
	const factory = sessionly.Factory.create<sessionly.Object<Session>>()
	const session = factory.create<Session>(
		"object",
		{
			sum: {
				load: async ({ session }) => {
					if (blocking)
						await contextSwitch()
					return sessionly.Record.values(session?.numbers).reduce<number>((result, number) => result + number, 0)
				},
				reload: ["numbers.*"],
			},
		},
		{
			sum: undefined,
			double: factory.create<Numbers>(
				"record",
				{
					load: async ({ session, property }) => {
						if (blocking)
							await contextSwitch()
						const value = session?.numbers?.[property[0]!]
						return value == undefined ? undefined : value * 2
					},
					reload: ["numbers.*"],
				},
				{}
			),
			half: factory.create<Numbers>(
				"record",
				{
					load: async ({ session, property }) => {
						if (blocking)
							await contextSwitch()
						const value = session?.numbers?.[property[0]!]
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
	return factory.start(session)
}

describe("Factory.handler.Record", () => {
	it("reload", async () => {
		const session = create(true)
		expect(session.numbers.a).toEqual(undefined)
		expect(session.numbers.b).toEqual(undefined)
		expect(session.numbers.c).toEqual(undefined)
		expect(session.double.c).toEqual(undefined)
		expect(session.sum).toEqual(undefined)
		await contextSwitch()
		expect(session.numbers.a).toEqual(0)
		expect(session.numbers.b).toEqual(1)
		expect(session.numbers.c).toEqual(2)
		expect(session.double.c).toEqual(undefined)
		expect(session.sum).toEqual(undefined)
		await contextSwitch()
		expect(session.sum).toEqual(3)
		session.numbers.c = 6
		expect(session.numbers.a).toEqual(0)
		expect(session.numbers.b).toEqual(1)
		expect(session.numbers.c).toEqual(2)
		expect(session.double.c).toEqual(4)
		expect(session.sum).toEqual(3)
		await contextSwitch()
		expect(session.numbers.a).toEqual(0)
		expect(session.numbers.b).toEqual(1)
		expect(session.numbers.c).toEqual(6)
		expect(session.double.c).toEqual(4)
		expect(session.sum).toEqual(3)
		await contextSwitch()
		expect(session.sum).toEqual(7)
		expect(session.double.c).toEqual(12)
	})
	it("reload + invalidate", async () => {
		const session = create(false)
		expect(session.numbers.b).toEqual(undefined)
		expect(session.numbers.c).toEqual(undefined)
		expect(session.double.cd).toEqual(undefined)
		expect(session.half.ch).toEqual(undefined)
		expect(session.sum).toEqual(undefined)
		await contextSwitch()
		expect(session.numbers.b).toEqual(1)
		expect(session.numbers.c).toEqual(2)
		expect(session.double.cd).toEqual(4)
		expect(session.half.ch).toEqual(1)
		expect(session.sum).toEqual(3)
		await contextSwitch()
		expect(session.double.cd).toEqual(4)
		expect(session.half.ch).toEqual(1)
		expect(session.sum).toEqual(3)
		await contextSwitch()
		delete session.numbers.c
		expect(session.numbers.c).toEqual(undefined)
		expect(session.double.cd).toEqual(4)
		expect(session.half.ch).toEqual(undefined)
		expect(session.sum).toEqual(3)
		await contextSwitch()
		expect(session.numbers.c).toEqual(2)
		expect(session.double.cd).toEqual(4)
		expect(session.half.ch).toEqual(1)
		expect(session.sum).toEqual(3)
		await contextSwitch()
		expect(session.numbers.c).toEqual(2)
		expect(session.double.cd).toEqual(4)
		expect(session.half.ch).toEqual(1)
		expect(session.sum).toEqual(3)
	})
	it("blocking reload + invalidate", async () => {
		const session = create(true)
		expect(session.numbers.b).toEqual(undefined)
		expect(session.numbers.c).toEqual(undefined)
		expect(session.double.cd).toEqual(undefined)
		expect(session.half.ch).toEqual(undefined)
		expect(session.sum).toEqual(undefined)
		await contextSwitch()
		expect(session.numbers.b).toEqual(1)
		expect(session.numbers.c).toEqual(2)
		expect(session.double.cd).toEqual(undefined)
		expect(session.half.ch).toEqual(undefined)
		expect(session.sum).toEqual(undefined)
		await contextSwitch()
		expect(session.double.cd).toEqual(4)
		expect(session.half.ch).toEqual(1)
		expect(session.sum).toEqual(3)
		await contextSwitch()
		delete session.numbers.c
		expect(session.numbers.c).toEqual(undefined)
		expect(session.double.cd).toEqual(4)
		expect(session.half.ch).toEqual(undefined)
		expect(session.sum).toEqual(3)
		await contextSwitch()
		expect(session.numbers.c).toEqual(2)
		expect(session.double.cd).toEqual(4)
		expect(session.half.ch).toEqual(undefined)
		expect(session.sum).toEqual(3)
		await contextSwitch()
		expect(session.numbers.c).toEqual(2)
		expect(session.double.cd).toEqual(4)
		expect(session.half.ch).toEqual(1)
		expect(session.sum).toEqual(3)
	})
})
