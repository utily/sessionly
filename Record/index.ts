import type { Factory } from "../Factory"
import { Listenable } from "../Listenable"
import { Configuration as RecordConfiguration } from "./Configuration"

const promise = new Promise(resolve => resolve(true))
export type SessionlyRecord<T> = T &
	Listenable<Required<SessionlyRecord.ListenableParameters<T>>> &
	SessionlyRecord.Symbol
export namespace SessionlyRecord {
	const symbol: unique symbol = Symbol("Record")
	export type Symbol = globalThis.Record<typeof symbol, typeof symbol>
	export import Configuration = RecordConfiguration
	export type ListenableParameters<T> = {
		[Property in keyof T | "*"]: Property extends keyof T
			? [value: T[Property], event: Property]
			: [value: T[keyof T], event: keyof T]
	}
	export type FactoryReturn<T> = {
		result: SessionlyRecord<T>
		backend: () => T
		listeners: Listenable.Listeners<ListenableParameters<T>>
	}

	export function create<T>(configuration: Configuration<SessionlyRecord<T>>, target: T): SessionlyRecord<T>
	export function create<T>(
		configuration: Configuration<T>,
		target: T,
		factory: Factory<Listenable<any>>
	): FactoryReturn<T>
	export function create<T extends globalThis.Record<keyof any, any>>(
		configuration: Configuration<T>,
		target: T,
		factory?: Factory<Listenable<any>>
	): SessionlyRecord<T> | FactoryReturn<T> {
		const listeners = Listenable.Listeners.create<ListenableParameters<T>>()
		const controllers = new Map<(...args: any) => any, Listenable.Controller>()
		const backend = Object.defineProperties(target, {
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
				value: <E extends keyof ListenableParameters<T>>(
					event: E,
					listener: (value: T[E], event: E) => void,
					options?: Listenable.Options
				): Listenable.Controller => {
					const controller = listeners.add(event, listener as any, options)
					controllers.set(listener, controller)
					if (!options?.passive)
						if (event === "*") {
							listeners.call(event, "read", ...([backend[event], event] as any))
							entries(backend).forEach(([key, value]: [any, any]) => listener(value, key))
						} else {
							listener(result[event], event)
							listeners.call(event, "read", ...([backend[event], event] as any))
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
		}) as SessionlyRecord<T>
		const result = new Proxy<SessionlyRecord<T>>(backend, {
			get(backend: T, p: keyof any, session: SessionlyRecord<T>): T[keyof T] | undefined {
				const property = p as T[keyof T]
				const current = backend[property]
				let result: T[keyof T] | undefined = current
				if (property === "*" || property in promise)
					result = undefined
				else if (property === "listen" || property === "unlisten")
					result = backend[property]
				else {
					if (current === undefined) {
						result = configuration.initiate?.({ session: factory?.session, me: session, property, current })
						if (result !== backend[property])
							session[property] = result as any
						configuration.load?.({ session: factory?.session, me: session, property, current }).then(result => {
							if (result !== backend[property])
								session[property] = result as any
						})
					}
					listeners.call(property, "read", ...([backend[property], property] as any))
					listeners.call("*", "read", ...([backend[property], property] as any))
				}
				return result
			},
			set(backend: T, p: keyof any, value: T[keyof T], session: SessionlyRecord<T>): boolean {
				const property = p as T[keyof T]
				if (property === "*")
					return false
				else if (!configuration.readonly && backend[property] !== value)
					(
						configuration.store?.({
							session: factory?.session,
							me: session,
							property,
							current: backend[property],
							value,
						}) ?? Promise.resolve(value)
					).then(result => {
						if (result !== backend[property]) {
							backend[property] = result as any
							listeners.call(property, "write", ...([result, property] as any))
							listeners.call("*", "write", ...([result, property] as any))
						}
					})
				return !configuration.readonly
			},
			deleteProperty(backend: T, p: string) {
				const property = p as T[keyof T]
				if (property === "*")
					return false
				else if (!configuration.readonly && backend[property] !== undefined) {
					delete backend[property]
					listeners.call("*", "write", ...([undefined, property] as any))
					listeners.call(property, "write", ...([undefined, property] as any))
				}
				return !configuration.readonly
			},
		})
		return !factory ? result : { result, backend: () => backend, listeners }
	}
	export function is(value: unknown): value is SessionlyRecord<globalThis.Record<string | number, unknown>> {
		return typeof value === "object" && !!value && symbol in value && value[symbol] === symbol
	}
	export function entries<T>(
		object: SessionlyRecord<T> | T | undefined
	): [
		Exclude<keyof T, keyof Listenable<ListenableParameters<T>> | keyof Symbol>,
		T[Exclude<keyof T, keyof Listenable<ListenableParameters<T>> | keyof Symbol>]
	][] {
		return object == undefined ? [] : (globalThis.Object.entries(object) as ReturnType<typeof entries>)
	}
	export function values<T>(
		object: SessionlyRecord<T> | T | undefined
	): T[Exclude<keyof T, keyof Listenable<ListenableParameters<T>> | keyof Symbol>][] {
		return object == undefined ? [] : (globalThis.Object.values(object) as ReturnType<typeof values>)
	}
	export function keys<T>(
		object: SessionlyRecord<T> | T | undefined
	): Exclude<keyof T, keyof Listenable<ListenableParameters<T> | keyof Symbol>>[] {
		return object == undefined ? [] : (globalThis.Object.keys(object) as ReturnType<typeof keys>)
	}
}
