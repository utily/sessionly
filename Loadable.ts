import { gracely } from "gracely"

export type Loadable<T> = T | false | undefined

export namespace Loadable {
	export function from<T>(response: T | gracely.Error): T | false {
		return !gracely.Error.is(response) && response
	}
	export function is<T>(value: unknown, is: (value: unknown) => value is T): value is Loadable<T> {
		return value === undefined || value === false || is(value)
	}
}
