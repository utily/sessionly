import { gracely } from "gracely"
import { List } from "./List"
import { Object } from "./Object"

export interface Errors {
	stack: List<gracely.Error>
	handle: <T>(response: T | gracely.Error) => T | false
}
export namespace Errors {
	export function create(): Object<Errors> {
		const errors = Object.create<Errors>(
			{},
			{
				stack: List.create<gracely.Error>({}, []),
				handle: <T>(response: T | gracely.Error): T | false => {
					const result = !gracely.Error.is(response)
					if (!result)
						errors.stack?.push(response)
					return result && response
				},
			}
		)
		return errors
	}
}
