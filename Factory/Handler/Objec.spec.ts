import { sessionly } from "../../index"

async function contextSwitch(): Promise<void> {
	return await new Promise(resolve => setTimeout(resolve, 0))
}
interface Session {
	sum?: number
	left: sessionly.Object<Number>
	right: sessionly.Object<Number>
}
interface Number {
	previous?: number
	value?: number
	double?: number
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
					return !me.left.value || !me.right.value ? undefined : me.left.value + me.right.value
				},
				reload: ["left.value", "right.value"],
			},
		},
		{
			left: factory.create<Number>(
				"object",
				{
					double: {
						load: async ({ me }) => {
							if (blocking)
								await contextSwitch()
							return !me.value ? undefined : me.value * 2
						},
						invalidate: ["left.value"],
						reload: ["left.value"],
					},
					value: {
						load: async ({ me, current }) => {
							if (blocking)
								await contextSwitch()
							me.previous = current ?? 0
							return (current ?? 0) + 1
						},
					},
				},
				{ value: undefined }
			),
			right: factory.create<Number>(
				"object",
				{
					double: {
						load: async ({ me }) => {
							if (blocking)
								await contextSwitch()
							return !me.value ? undefined : me.value * 2
						},
						invalidate: ["right.value"],
						reload: ["right.double"],
					},
					value: {
						load: async ({ me, current }) => {
							if (blocking)
								await contextSwitch()
							me.previous = current ?? 0
							return (current ?? 0) + 1
						},
					},
				},
				{ value: undefined }
			),
		}
	)
	return factory.start(session)
}

describe("Factory.Handler.Object", () => {
	it("reload + invalidate", async () => {
		const session = create(false)
		expect(session.left.value).toEqual(undefined)
		expect(session.right.value).toEqual(undefined)
		expect(session.sum).toEqual(undefined)
		await contextSwitch()
		expect(session.left.value).toEqual(1)
		expect(session.right.value).toEqual(1)
		expect(session.sum).toEqual(2)
		await contextSwitch()
		expect(session.left.value).toEqual(1)
		expect(session.right.value).toEqual(1)
		expect(session.sum).toEqual(2)

		expect(session.left.previous).toEqual(0)
		expect(session.right.previous).toEqual(0)
		expect(session.left.double).toEqual(undefined)
		expect(session.right.double).toEqual(undefined)
		await contextSwitch()
		expect(session.left.double).toEqual(2)
		expect(session.right.double).toEqual(2)
		await contextSwitch()
		delete session.left.value
		expect(session.left.value).toEqual(undefined)
		expect(session.sum).toEqual(2)
		expect(session.left.double).toEqual(undefined)
		await contextSwitch()
		expect(session.left.value).toEqual(1)
		expect(session.sum).toEqual(2)
		expect(session.left.double).toEqual(2)
	})
	it("blocking reload + invalidate", async () => {
		const session = create(true)
		expect(session.left.value).toEqual(undefined)
		expect(session.right.value).toEqual(undefined)
		expect(session.sum).toEqual(undefined)
		await contextSwitch()
		expect(session.left.value).toEqual(1)
		expect(session.right.value).toEqual(1)
		expect(session.sum).toEqual(undefined)
		await contextSwitch()
		expect(session.left.value).toEqual(1)
		expect(session.right.value).toEqual(1)
		expect(session.sum).toEqual(2)

		expect(session.left.previous).toEqual(0)
		expect(session.right.previous).toEqual(0)
		expect(session.left.double).toEqual(undefined)
		expect(session.right.double).toEqual(undefined)
		await contextSwitch()
		expect(session.left.double).toEqual(2)
		expect(session.right.double).toEqual(2)
		await contextSwitch()
		delete session.left.value
		expect(session.left.value).toEqual(undefined)
		expect(session.sum).toEqual(2)
		expect(session.left.double).toEqual(undefined)
		await contextSwitch()
		expect(session.left.value).toEqual(1)
		expect(session.sum).toEqual(undefined)
		expect(session.left.double).toEqual(undefined)
		await contextSwitch()
		expect(session.sum).toEqual(2)
		expect(session.left.double).toEqual(2)
	})
})
