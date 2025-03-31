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
		expect(sessionly.Loadable.getType(type).is(false)).toEqual(true)
		expect(sessionly.Loadable.getType(type).is(undefined)).toEqual(true)
		expect(sessionly.Loadable.getType(type).is(testObject)).toEqual(true)
		expect(sessionly.Loadable.getType(type).is(true)).toEqual(false)
		expect(sessionly.Loadable.getType(type).is(null)).toEqual(false)
	})
})
