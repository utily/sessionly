import { typedly } from "../../typedly"
import { Listenable } from "../Listenable"
import type { Factory } from "./index"

export namespace navigation {
	export function path(state: Listenable<any>, listenable: unknown): Listenable<any>[] {
		let result: Listenable<any>[] = []
		if (state == listenable)
			result = Listenable.is(listenable) ? [listenable] : []
		else
			for (const value of typedly.Object.values(state))
				if (Listenable.is(value)) {
					const nodes = path(value, listenable)
					if (nodes.length) {
						result = [state, ...nodes]
						break
					}
				}
		return result
	}
	export function resolve(
		factory: Factory<any>,
		target: unknown,
		path: string
	): { target: Listenable<any>; key: string } | undefined {
		let segments = path.split(/(?<!\\)\./).map(segment => segment.replaceAll(/\\./g, "."))
		if (segments.length <= 1 || segments[0] != "") {
			target = factory.state ?? target
		} else {
			segments = segments.slice(1)
			const nodes = navigation.path(factory.state ?? target, target)
			while (segments.length > 1 && segments[0] == "") {
				segments.shift()
				nodes.pop()
			}
			const result = nodes.at(-1)
			if (result)
				target = result
		}
		let result: { target: Listenable<any>; key: string } | undefined
		for (let next: unknown = target; segments.length; next = (next as any)[segments.shift() ?? segments[0]])
			if (segments.length == 1) {
				result = !Listenable.is(next) ? undefined : { target: next, key: segments[0] }
				break
			}
		return result
	}
}
