import { isly } from "isly"
import { typedly } from "typedly"
import { Controller as _Controller } from "./Controller"
import { Listeners as _Listeners } from "./Listeners"
import { Options as _Options } from "./Options"

// TODO must support unlisten to be compatible with userwidgets / smoothly.Listenable
export interface Listenable<T extends { [Event in keyof typedly.Object<T>]: any[] }> {
	listen<E extends keyof T>(
		event: E,
		listener: (...argument: T[E]) => void,
		options?: Listenable.Options
	): Listenable.Controller
	unlisten(listener: (...args: any[]) => any): void
}
export namespace Listenable {
	export import Controller = _Controller
	export import Listeners = _Listeners
	export import Options = _Options
	export const { type, is, flawed } = isly
		.object<Listenable<object>>(
			{
				listen: isly.function(),
				unlisten: isly.function(),
			},
			"isly.Listenable"
		)
		.bind()
}
