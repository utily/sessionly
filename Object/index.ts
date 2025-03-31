import { typedly } from "typedly"
import type { Factory } from "../Factory"
import { Listenable } from "../Listenable"
import { Configuration as ObjectConfiguration } from "./Configuration"

const promise = new Promise(resolve => resolve(true))
export type SessionlyObject<T extends typedly.Object<T>> = T &
	Listenable<Required<SessionlyObject.ListenableParameters<T>>> &
	SessionlyObject.Symbol

export namespace SessionlyObject {
	const symbol: unique symbol = Symbol("Object")
	export type Symbol = Record<typeof symbol, typeof symbol>
	export import Configuration = ObjectConfiguration
	export type ListenableParameters<T> = { [Property in keyof T]: [value: T[Property], event: Property] }
	export type FactoryReturn<T> = {
		result: SessionlyObject<T>
		backend: () => T
		listeners: Listenable.Listeners<ListenableParameters<T>>
	}
	export function create<T extends typedly.Object<T>>(configuration: Configuration<T>, target: T): SessionlyObject<T>
	export function create<T extends typedly.Object<T>>(
		configuration: Configuration<T>,
		target: T,
		factory: Factory<Listenable<any>>
	): FactoryReturn<T>
	export function create<T extends typedly.Object<T>>(
		configuration: Configuration<T>,
		target: T,
		factory?: Factory<Listenable<any>>
	): SessionlyObject<T> | FactoryReturn<T> {
		const controllers = new Map<(...argument: any[]) => any, Listenable.Controller>()
		const listeners = Listenable.Listeners.create<ListenableParameters<T>>()
		const backend = globalThis.Object.defineProperties(target, {
			[symbol]: {
				enumerable: false,
				configurable: true,
				writable: false,
				value: symbol,
			},
			listen: {
				enumerable: false,
				configurable: true,
				writable: false,
				value: <E extends keyof T>(
					event: E,
					listener: (value: T[E], event: E) => void,
					options?: Listenable.Options
				): Listenable.Controller => {
					const controller = listeners.add(event, listener, options)
					controllers.set(listener, controller)
					if (!options?.passive) {
						listener(result[event], event)
						listeners.call(event, "read", backend[event], event)
					}
					return controller
				},
			},
			unlisten: {
				enumerable: false,
				configurable: true,
				writable: false,
				value: (listener: (...argument: any[]) => any) => {
					controllers.get(listener)?.abort()
					controllers.delete(listener)
				},
			},
		}) as SessionlyObject<T>
		const result = new Proxy<SessionlyObject<T>>(backend, {
			get(backend: T, p: string, session: SessionlyObject<T>): T[keyof T] | undefined {
				const property = p as keyof T
				const propertyConfiguration = configuration[property]
				const current = backend[property]
				let result: T[keyof T] | undefined = current
				if (property === "listen" || property === "unlisten")
					result = backend[property]
				else if (!(property in promise)) {
					if (current === undefined) {
						result = propertyConfiguration?.initiate?.({ session: factory?.session, me: session, property, current })
						if (result !== backend[property])
							session[property] = result as any
						propertyConfiguration
							?.load?.({ session: factory?.session, me: session, property, current })
							.then(result => {
								if (result !== backend[property])
									session[property] = result as any
							})
					}
					listeners.call(property, "read", backend[property], property)
				}
				return result
			},
			set(backend: T, p: string, value: T[keyof T], session: SessionlyObject<T>): boolean {
				const property = p as keyof T
				const propertyConfiguration = configuration[property]
				if (!propertyConfiguration?.readonly && backend[property] !== value)
					(
						propertyConfiguration?.store?.({
							session: factory?.session,
							me: session,
							property,
							current: backend[property],
							value,
						}) ?? Promise.resolve(value)
					).then(result => {
						if (result !== backend[property]) {
							backend[property] = result as any
							listeners.call(property, "write", result as any, property)
						}
					})
				return !propertyConfiguration?.readonly
			},
			deleteProperty(backend: T, p: string): boolean {
				const property = p as keyof T
				const propertyConfiguration = configuration[property]
				if (!propertyConfiguration?.readonly && backend[property] !== undefined) {
					delete backend[property]
					listeners.call(property, "write", undefined as any, property)
				}
				return !propertyConfiguration?.readonly
			},
		})
		return !factory ? result : { result, backend: () => backend, listeners }
	}
	export function is(value: unknown): value is SessionlyObject<globalThis.Record<string | number, unknown>> {
		return typeof value === "object" && !!value && symbol in value && value[symbol] === symbol
	}
	export function entries<T extends object>(
		object: SessionlyObject<T> | T | undefined
	): [
		Exclude<keyof T, keyof Listenable<ListenableParameters<T>> | keyof Symbol>,
		T[Exclude<keyof T, keyof Listenable<ListenableParameters<T>> | keyof Symbol>]
	][] {
		return object === undefined ? [] : (globalThis.Object.entries(object) as ReturnType<typeof entries>)
	}
	export function values<T extends object>(
		object: SessionlyObject<T> | T | undefined
	): T[Exclude<keyof T, keyof Listenable<ListenableParameters<T>> | keyof Symbol>][] {
		return object === undefined ? [] : (globalThis.Object.values(object) as ReturnType<typeof values>)
	}
	export function keys<T extends object>(
		object: SessionlyObject<T> | T | undefined
	): Exclude<keyof T, keyof Listenable<ListenableParameters<T>> | keyof Symbol>[] {
		return object === undefined ? [] : (globalThis.Object.keys(object) as ReturnType<typeof keys>)
	}
}
