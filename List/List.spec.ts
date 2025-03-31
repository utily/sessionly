import { sessionly } from "../index"

async function contextSwitch(): Promise<void> {
	return await new Promise(resolve => setTimeout(resolve, 0))
}
interface Session {
	sum?: number
	numbers: sessionly.List<number>
	double: sessionly.List<number>
}

describe("List", () => {
	it("configuration", async () => {
		type SessionConfiguration = sessionly.Object.Configuration<Session, sessionly.Object<Session>>
		type NumbersConfiguration = sessionly.List.Configuration<number, sessionly.Object<Session>>
		const numbers: NumbersConfiguration = {
			load: async ({ current }) => {
				return current ?? []
			},
		}
		const double: NumbersConfiguration = {
			load: async ({ session }) => {
				return session?.numbers.reduce<number[]>((result, number) => result.concat(number, number), [])
			},
			reload: ["numbers.change"],
		}
		const session: SessionConfiguration = {
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
		expect(session).toBeTruthy()
	})
	it("create + is", () => {
		const session = sessionly.List.create<number>({}, [0, 1, 2])
		expect(sessionly.List.is(session)).toEqual(true)
		expect(sessionly.List.is([0, 1, 2])).toEqual(false)
	})
	it("load", async () => {
		const sessions = {
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
		expect(sessions.loaded.toArray()).toEqual([0, 1, 2])
		expect(sessions.loaded.toArray()).toEqual([0, 1, 2])
		await contextSwitch()
		expect(sessions.loaded.toArray()).toEqual([0, 1, 2])

		expect(sessions.unloaded.toArray()).toEqual([])
		expect(sessions.unloaded.toArray()).toEqual([])
		await contextSwitch()
		expect(sessions.unloaded.toArray()).toEqual([0, 1, 2])
	})
	it("initiate", async () => {
		const sessions = {
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
		expect(sessions.initiated.toArray()).toEqual([0])
		expect(sessions.initiated.toArray()).toEqual([0])
		await contextSwitch()
		expect(sessions.initiated.toArray()).toEqual([1])
	})
	it("change", async () => {
		const session = sessionly.List.create<number>(
			{
				change: async ({ value }) => {
					await contextSwitch()
					return value
				},
			},
			[]
		)
		expect(session.toArray()).toEqual([])
		session.change([0, 1, 2])
		expect(session.toArray()).toEqual([])
		await contextSwitch()
		await contextSwitch()
		expect(session.toArray()).toEqual([0, 1, 2])
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
		const sessions = {
			passive: { read: factory(), write: factory() },
			active: { read: factory(), write: factory() },
		}
		const values: { passive: { read: unknown[]; write: unknown[] }; active: { read: unknown[]; write: unknown[] } } = {
			active: { read: [], write: [] },
			passive: { read: [], write: [] },
		}
		sessions.passive.read.listen("read", value => values.passive.read.push(value.length), { passive: true })
		sessions.passive.write.listen("change", value => values.passive.write.push(value.length), { passive: true })
		sessions.active.read.listen("read", value => values.active.read.push(value.length))
		sessions.active.write.listen("change", value => values.active.write.push(value.length))

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

		expect(sessions.passive.read.toArray()).toEqual([])
		expect(sessions.passive.write.toArray()).toEqual([])
		expect(sessions.active.read.toArray()).toEqual([1])
		expect(sessions.active.write.toArray()).toEqual([1])
		await contextSwitch()
		expect(values.passive.read).toEqual([0])
		expect(values.passive.read.length).toEqual(1)
		expect(values.passive.write).toEqual([1])
		expect(values.passive.write.length).toEqual(1)
		expect(values.active.read).toEqual([0, 1])
		expect(values.active.read.length).toEqual(2)
		expect(values.active.write).toEqual([0, 1])
		expect(values.active.write.length).toEqual(2)

		expect(sessions.passive.read.toArray()).toEqual([1])
		expect(sessions.passive.write.toArray()).toEqual([1])
		expect(sessions.active.read.toArray()).toEqual([1])
		expect(sessions.active.write.toArray()).toEqual([1])
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
