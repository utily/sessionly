import { typedly } from "typedly"
import { Controller } from "./Controller"
import { Options } from "./Options"

export class Listeners<T extends { [Event in keyof typedly.Object<T>]: any[] }> {
	private backend: {
		[Event in keyof T]?: { listener: (...argument: T[Event]) => void; options?: Options; controller: Controller }[]
	} = {}
	get events(): (keyof T)[] {
		return typedly.Object.keys(this.backend)
	}
	private constructor() {}
	add<E extends keyof T>(event: E, listener: (...argument: T[E]) => void, options?: Options): Controller {
		const result = {
			listener,
			options,
			controller: {
				abort: () => {
					const index = this.backend[event]?.findIndex(entry => entry.listener === listener)
					if (index !== undefined && index !== -1)
						this.backend[event]?.splice(index, 1)
				},
			},
		}
		if (!this.backend[event]?.push(result))
			this.backend[event] = [result]
		return result.controller
	}
	call<E extends keyof T>(event: E, trigger: Exclude<Options["trigger"], undefined>, ...argument: T[E]): void {
		this.backend[event]?.slice()?.forEach(({ listener, options, controller }) => {
			if (options?.trigger ? options.trigger == trigger : trigger == "write") {
				if (options?.once)
					controller.abort()
				listener(...argument)
			}
		})
	}
	static create<T extends { [Event in keyof typedly.Object<T>]: any[] }>(): Listeners<T> {
		return new this<T>()
	}
}
export namespace Listeners {}
