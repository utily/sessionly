import { isly } from "isly"
import { sessionly } from "./index"

describe("Loadable", () => {
	it("is", () => {
		interface TestObject {
			foo: string
			bar: number
			baz: boolean
		}
		const type = isly.object<TestObject>({ foo: isly.string(), bar: isly.number(), baz: isly.boolean() })
		const testObject = { foo: "text", bar: 0, baz: true }
		expect(sessionly.Loadable.is(false, type.is)).toEqual(true)
		expect(sessionly.Loadable.is(undefined, type.is)).toEqual(true)
		expect(sessionly.Loadable.is(testObject, type.is)).toEqual(true)
		expect(sessionly.Loadable.is(true, type.is)).toEqual(false)
		expect(sessionly.Loadable.is(null, type.is)).toEqual(false)
	})
})
