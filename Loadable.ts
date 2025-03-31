import { gracely } from "gracely"
import { isly } from "isly"

export type Loadable<T> = T | false | undefined

export namespace Loadable {
	export function from<T>(response: T | gracely.Error): T | false {
		return !gracely.Error.is(response) && response
	}
	export function getType<T>(type: isly.Type<T>): isly.Type<Loadable<T>> {
		return isly
			.union<Loadable<T>>(isly.boolean(false), isly.undefined(), type)
			.rename(`Loadable<${type.name}>`) as isly.Type<Loadable<T>>
	}
}
