import { sessionly } from "../index"

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

describe("Object", () => {
	it("configuration", () => {
		type NumberConfiguration = sessionly.Object.Configuration<Number, sessionly.Object<Session>>
		type SessionConfiguration = sessionly.Object.Configuration<Session, sessionly.Object<Session>>
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
		const session: SessionConfiguration = {
			sum: {
				load: async ({ session }) => {
					const result =
						!session?.left.value || !session.right.value ? undefined : session.left.value + session.right.value
					return result
				},
				reload: ["left.value", "right.value"],
			},
		}
		expect(left).toBeTruthy()
		expect(right).toBeTruthy()
		expect(session).toBeTruthy()
	})
	it("create + is", async () => {
		const session = sessionly.Object.create<Number>({}, { value: 0 })
		expect(sessionly.Object.is(session)).toEqual(true)
		expect(sessionly.Object.is({ value: 0 })).toEqual(false)
	})
	it("load", async () => {
		const sessions = {
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
		expect(sessions.loaded.value).toEqual(0)
		await contextSwitch()
		expect(sessions.loaded.value).toEqual(0)

		expect(sessions.unloaded.value).toEqual(undefined)
		await contextSwitch()
		expect(sessions.unloaded.value).toEqual(0)
	})
	it("initiate", async () => {
		const sessions = {
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
		expect(sessions.initiated.value).toEqual(0)
		expect(sessions.initiated.value).toEqual(0)
		await contextSwitch()
		expect(sessions.initiated.value).toEqual(1)
	})
	it("store", async () => {
		const session = sessionly.Object.create<Number>(
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
		expect(session.value).toEqual(0)
		session.value = 1
		expect(session.value).toEqual(0)
		await contextSwitch()
		expect(session.value).toEqual(1)
	})
	it("readonly", async () => {
		const session = sessionly.Object.create<Number>(
			{
				value: { readonly: true },
			},
			{ value: 1 }
		)
		expect(session.value).toEqual(1)
		try {
			session.value = 2
			// expecting assignment above to fail
			expect(true).toEqual(false)
		} catch (e) {
			expect(e).toBeTruthy()
		}
		await contextSwitch()
		expect(session.value).toEqual(1)
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
		const sessions = {
			passive: { read: factory(), write: factory() },
			active: { write: factory(), read: factory() },
		}
		const values: { passive: { read: unknown[]; write: unknown[] }; active: { read: unknown[]; write: unknown[] } } = {
			active: { read: [], write: [] },
			passive: { read: [], write: [] },
		}
		sessions.passive.read.listen("value", value => values.passive.read.push(value), { passive: true, trigger: "read" })
		sessions.passive.write.listen("value", value => values.passive.write.push(value), { passive: true })
		sessions.active.read.listen("value", value => values.active.read.push(value), { trigger: "read" })
		sessions.active.write.listen("value", value => values.active.write.push(value))

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

		expect(sessions.passive.read.value).toEqual(undefined)
		expect(sessions.passive.write.value).toEqual(undefined)
		expect(sessions.active.read.value).toEqual(1)
		expect(sessions.active.write.value).toEqual(1)
		await contextSwitch()
		expect(values.passive.read).toEqual([undefined])
		expect(values.passive.read.length).toEqual(1)
		expect(values.passive.write).toEqual([1])
		expect(values.passive.write.length).toEqual(1)
		expect(values.active.read).toEqual([undefined, undefined, undefined, 1])
		expect(values.active.read.length).toEqual(4)
		expect(values.active.write).toEqual([undefined, 1])
		expect(values.active.write.length).toEqual(2)

		expect(sessions.passive.read.value).toEqual(1)
		expect(sessions.passive.write.value).toEqual(1)
		expect(sessions.active.read.value).toEqual(1)
		expect(sessions.active.write.value).toEqual(1)
		await contextSwitch()
		expect(values.passive.read).toEqual([undefined, 1])
		expect(values.passive.read.length).toEqual(2)
		expect(values.passive.write).toEqual([1])
		expect(values.passive.write.length).toEqual(1)
		expect(values.active.read).toEqual([undefined, undefined, undefined, 1, 1])
		expect(values.active.read.length).toEqual(5)
		expect(values.active.write).toEqual([undefined, 1])
		expect(values.active.write.length).toEqual(2)

		expect(sessions.passive.read.value).toEqual(1)
		expect(sessions.passive.write.value).toEqual(1)
		expect(sessions.active.read.value).toEqual(1)
		expect(sessions.active.write.value).toEqual(1)
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
		const session = sessionly.Object.create<Number>({}, { value: 1 })
		const calls = { value: 0 }
		session.listen("value", () => calls.value++, { passive: true })
		await contextSwitch()
		expect(calls).toEqual({ value: 0 })
		expect(session.value).toEqual(1)
		delete session.value
		expect(session.value).toEqual(undefined)
		expect(calls).toEqual({ value: 1 })
	})
})
