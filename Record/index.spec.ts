import { sessionly } from "../index"

async function contextSwitch(): Promise<void> {
	return await new Promise(resolve => setTimeout(resolve, 0))
}
interface Session {
	sum?: number
	numbers: sessionly.Record<Numbers>
}
type Numbers = Record<string, number>

describe("Record", () => {
	it("Configuration", () => {
		type SessionConfiguration = sessionly.Object.Configuration<Session, sessionly.Object<Session>>
		type NumbersConfiguration = sessionly.Record.Configuration<sessionly.Record<Numbers>, sessionly.Record<Session>>
		const numbers: NumbersConfiguration = {
			load: async ({ current }) => {
				return current ?? 0
			},
		}
		const session: SessionConfiguration = {
			sum: {
				load: async ({ session }) => {
					await contextSwitch()
					return sessionly.Record.values(session?.numbers).reduce<number>((result, number) => result + (number ?? 0), 0)
				},
				reload: ["numbers.*"],
			},
		}
		expect(numbers).toBeTruthy()
		expect(session).toBeTruthy()
	})
	it("create + is", async () => {
		const session = sessionly.Record.create<Numbers>({}, { a: 0, b: 1 })
		expect(sessionly.Record.is(session)).toEqual(true)
		expect(sessionly.Record.is({ a: 0, b: 1 })).toEqual(false)
	})
	it("load", async () => {
		const sessions = {
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
		expect(sessions.loaded.a).toEqual(0)
		expect(sessions.loaded.a).toEqual(0)
		await contextSwitch()
		expect(sessions.loaded.a).toEqual(0)

		// 2 get accesses to value to make sure nothing sync is changing between gets
		expect(sessions.unloaded.a).toEqual(undefined)
		expect(sessions.unloaded.a).toEqual(undefined)
		await contextSwitch()
		expect(sessions.unloaded.a).toEqual(0)
	})
	it("initiate", async () => {
		const sessions = {
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
		expect(sessions.initiated.a).toEqual(0)
		expect(sessions.initiated.a).toEqual(0)
		await contextSwitch()
		expect(sessions.initiated.a).toEqual(1)
	})
	it("store", async () => {
		const session = sessionly.Record.create<Numbers>(
			{
				store: async ({ value }) => {
					await contextSwitch()
					return value
				},
			},
			{ a: 0 }
		)
		expect(session.a).toEqual(0)
		session.a = 1
		expect(session.a).toEqual(0)
		await contextSwitch()
		expect(session.a).toEqual(1)
	})
	it("readonly", async () => {
		const session = sessionly.Record.create<Numbers>({ readonly: true }, { a: 1 })
		expect(session.a).toEqual(1)
		try {
			session.a = 2
			expect(true).toEqual(false)
		} catch (e) {
			expect(e).toBeTruthy()
		}
		await contextSwitch()
		expect(session.a).toEqual(1)
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
		const sessions = {
			passive: { read: factory(), write: factory() },
			active: { read: factory(), write: factory() },
		}
		const values: { passive: { read: unknown[]; write: unknown[] }; active: { read: unknown[]; write: unknown[] } } = {
			active: { read: [], write: [] },
			passive: { read: [], write: [] },
		}
		sessions.passive.read.listen("value", value => values.passive.read.push(value), { passive: true, trigger: "read" })
		sessions.passive.write.listen("value", value => values.passive.write.push(value), { passive: true })
		sessions.active.read.listen("value", value => values.active.read.push(value), { trigger: "read" })
		sessions.active.write.listen("value", value => values.active.write.push(value), { trigger: "write" })

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
		const session = sessionly.Record.create<Numbers>({}, { value: 1 })
		const calls = { value: 0, "*": 0 }
		session.listen("value", () => calls.value++, { passive: true })
		session.listen("*", () => calls["*"]++, { passive: true })
		await contextSwitch()
		expect(calls).toEqual({ value: 0, "*": 0 })
		expect(session.value).toEqual(1)
		delete session.value
		expect(session.value).toEqual(undefined)
		expect(calls).toEqual({ value: 1, "*": 1 })
	})
})
