import { sessionly } from "../../index"

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

function create(blocking: boolean): sessionly.Object<State> {
	const factory = sessionly.Factory.create<sessionly.Object<State>>()
	const state = factory.create<State>(
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
	return factory.start(state)
}

describe("Factory.Handler.Object", () => {
	it("reload + invalidate", async () => {
		const state = create(false)
		expect(state.left.value).toEqual(undefined)
		expect(state.right.value).toEqual(undefined)
		expect(state.sum).toEqual(undefined)
		await contextSwitch()
		expect(state.left.value).toEqual(1)
		expect(state.right.value).toEqual(1)
		expect(state.sum).toEqual(2)
		await contextSwitch()
		expect(state.left.value).toEqual(1)
		expect(state.right.value).toEqual(1)
		expect(state.sum).toEqual(2)

		expect(state.left.previous).toEqual(0)
		expect(state.right.previous).toEqual(0)
		expect(state.left.double).toEqual(undefined)
		expect(state.right.double).toEqual(undefined)
		await contextSwitch()
		expect(state.left.double).toEqual(2)
		expect(state.right.double).toEqual(2)
		await contextSwitch()
		delete state.left.value
		expect(state.left.value).toEqual(undefined)
		expect(state.sum).toEqual(2)
		expect(state.left.double).toEqual(undefined)
		await contextSwitch()
		expect(state.left.value).toEqual(1)
		expect(state.sum).toEqual(2)
		expect(state.left.double).toEqual(2)
	})
	it("blocking reload + invalidate", async () => {
		const state = create(true)
		expect(state.left.value).toEqual(undefined)
		expect(state.right.value).toEqual(undefined)
		expect(state.sum).toEqual(undefined)
		await contextSwitch()
		expect(state.left.value).toEqual(1)
		expect(state.right.value).toEqual(1)
		expect(state.sum).toEqual(undefined)
		await contextSwitch()
		expect(state.left.value).toEqual(1)
		expect(state.right.value).toEqual(1)
		expect(state.sum).toEqual(2)

		expect(state.left.previous).toEqual(0)
		expect(state.right.previous).toEqual(0)
		expect(state.left.double).toEqual(undefined)
		expect(state.right.double).toEqual(undefined)
		await contextSwitch()
		expect(state.left.double).toEqual(2)
		expect(state.right.double).toEqual(2)
		await contextSwitch()
		delete state.left.value
		expect(state.left.value).toEqual(undefined)
		expect(state.sum).toEqual(2)
		expect(state.left.double).toEqual(undefined)
		await contextSwitch()
		expect(state.left.value).toEqual(1)
		expect(state.sum).toEqual(undefined)
		expect(state.left.double).toEqual(undefined)
		await contextSwitch()
		expect(state.sum).toEqual(2)
		expect(state.left.double).toEqual(2)
	})
})
