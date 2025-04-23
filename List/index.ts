import { http } from "cloudly-http"
import { typedly } from "typedly"
import { Factory } from "../Factory"
import { Listenable } from "../Listenable"
import { Configuration as _Configuration } from "./Configuration"
import { Events as ListEvents } from "./Events"

const symbol: unique symbol = Symbol("List")

export class List<T> extends typedly.Collection<T> implements Listenable<List.ListenableParameters<T>>, List.Symbol {
	[symbol]: typeof symbol = symbol
	private readonly controllers = new Map<(...argument: any[]) => any, Listenable.Controller>()
	private readonly listeners = Listenable.Listeners.create<List.ListenableParameters<T>>()
	get length(): number {
		return this.backend.length
	}
	#continuable?: boolean
	get continuable(): boolean | undefined {
		return this.#continuable
	}
	#backend?: http.Continuable<T>
	protected get backend(): http.Continuable<T> {
		const current = this.#backend
		let result = current
		if (current === undefined) {
			result = this.configuration.initiate?.({ session: this.factory?.session, me: this, current })
			if (result !== this.#backend) {
				this.backend = result
				this.listeners.call("change", "write", result ?? [], "change")
			}
			this.configuration.load?.({ session: this.factory?.session, me: this, current }).then(result => {
				if (result !== this.#backend) {
					this.backend = result
					this.listeners.call("change", "write", result ?? [], "change")
				}
			})
		}
		result = result ?? []
		return result
	}
	protected set backend(value: http.Continuable<T> | undefined) {
		this.#backend = value
	}
	protected constructor(
		private readonly configuration: List.Configuration<T>,
		initial: T[] | undefined,
		private readonly factory?: Factory<Listenable<any>>
	) {
		super()
		this.backend = initial
	}
	entries(): IterableIterator<[number, T]> {
		const result = this.backend.entries()
		this.listeners.call("read", "read", [...(this.#backend ?? [])], "read")
		return result
	}
	async change(source: http.Continuable<T> | undefined): Promise<http.Continuable<T> | undefined> {
		const current = this.backend
		return (
			this.configuration.change?.({ session: this.factory?.session, me: this, current, value: source }) ??
			Promise.resolve(source)
		).then(async result => {
			if (result) {
				this.backend = result
				this.listeners.call("change", "write", result, "change")
			}
			return result
		})
	}
	// TODO should this be able to take a "creatable" type?
	async push(item: T): Promise<T | undefined> {
		const current = this.backend
		return (
			this.configuration.push?.({ session: this.factory?.session, me: this, current: current, value: item }) ??
			Promise.resolve(item)
		).then(async result => {
			if (result) {
				const current = this.#backend ?? []
				current.push(item)
				this.backend = current
				this.listeners.call("push", "write", item, this.length - 1, current, "push")
				this.listeners.call("change", "write", current, "change")
			}
			return result
		})
	}
	// TODO should this be able to take a "changeable" type?
	async replace(index: number, item: T): Promise<T | undefined> {
		const current = this.backend
		return (
			this.configuration.replace?.({ session: this.factory?.session, me: this, current, value: item, index }) ??
			Promise.resolve({ value: item, index })
		)?.then(async result => {
			if (result) {
				const current = this.#backend ?? []
				const removed = current.splice(result.index, 1, result.value).at(0)
				this.backend = current
				this.listeners.call("replace", "write", result.value, result.index, removed, current, "replace")
				this.listeners.call("change", "write", current, "change")
			}
			return result?.value
		})
	}
	async remove(index: number): Promise<T | undefined> {
		const current = this.backend
		return (
			this.configuration
				.remove?.({ session: this.factory?.session, me: this, current, index })
				.then(result => (result ? result : { index: undefined })) ?? Promise.resolve({ index })
		).then(async ({ index }) => {
			let result: T | undefined = undefined
			if (index) {
				const current = this.#backend ?? []
				const removed = current.splice(index).at(0)
				if (removed) {
					result = removed
					this.backend = current
					this.listeners.call("remove", "write", index, removed, current, "remove")
					this.listeners.call("change", "write", current, "change")
				}
			}
			return result
		})
	}
	async next(): Promise<http.Continuable<T> | undefined> {
		return await this.configuration
			.next?.({ session: this.factory?.session, me: this, current: this.backend })
			.then(result => {
				if (result) {
					this.#continuable = !!result.cursor
					const offset = this.#backend?.length ?? 0
					const next = [...(this.#backend ?? []), ...result]
					this.backend = next
					result.forEach((value, index) => this.listeners.call("push", "write", value, offset + index, next, "push"))
					this.listeners.call("change", "write", result, "change")
				}
				return result
			})
	}
	invalidate(): T[] {
		const current = this.#backend ?? []
		this.backend = undefined
		this.listeners.call("change", "write", [], "change")
		return current
	}

	listen<E extends keyof List.Events<T>>(
		event: E,
		listener: (...argument: List.Events<T>[E]) => void,
		options?: Omit<Listenable.Options, "trigger">
	): Listenable.Controller {
		const result = this.listeners.add(event, listener, { ...options, trigger: event === "read" ? "read" : undefined })
		this.controllers.set(listener, result)
		if (!options?.passive && (event == "change" || event == "read")) {
			const backend = this.backend
			if (event == "change")
				this.listeners.call("change", "write", backend, "change")
			else
				this.listeners.call("read", "read", backend, "read")
		}
		return result
	}
	unlisten(listener: (...args: any[]) => any): void {
		this.controllers.get(listener)?.abort()
		this.controllers.delete(listener)
	}

	static symbol = symbol
	static create<T>(configuration: List.Configuration<T>, initial: T[] | undefined): List<T>
	static create<T>(
		configuration: List.Configuration<T>,
		initial: T[] | undefined,
		factory: Factory<Listenable<any>>
	): List.FactoryReturn<T>
	static create<T>(
		configuration: List.Configuration<T>,
		initial: T[] | undefined,
		factory?: Factory<Listenable<any>>
	): List<T> | List.FactoryReturn<T> {
		const result = new this<T>(configuration, initial, factory)
		return !factory ? result : { result, backend: () => result.#backend, listeners: result.listeners }
	}
	static is(value: unknown): value is List<unknown> {
		return value instanceof List && value[symbol] == symbol
	}
}
export namespace List {
	export import Configuration = _Configuration
	export import Events = ListEvents
	export type Symbol = Record<typeof symbol, typeof symbol>
	export type ListenableParameters<T> = Events<T>
	export type FactoryReturn<T> = {
		result: List<T>
		backend: () => T[] | undefined
		listeners: Listenable.Listeners<ListenableParameters<T>>
	}
}
