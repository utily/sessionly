import { typedly } from "typedly"
import { List } from "../List"
import { Listenable } from "../Listenable"
import { Object } from "../Object"
import { Record } from "../Record"
import { Handler } from "./Handler"

export class Factory<
	TSession extends Listenable<globalThis.Record<string | number, any>> = Listenable<
		globalThis.Record<string | number, any>
	>
> {
	#session?: TSession | undefined
	get session(): TSession | undefined {
		return this.#session
	}
	get ready(): boolean {
		return this.#session !== undefined
	}
	private readonly handlers = globalThis.Object.assign(
		new typedly.IterableWeakMap<Object<any> | Record<any> | List<any>, Handler>(),
		{
			created: new typedly.IterableWeakMap<Object<any> | Record<any> | List<any>, Handler>(),
			started: new typedly.IterableWeakMap<Object<any> | Record<any> | List<any>, Handler>(),
		}
	)

	private constructor() {}

	create<T>(type: "list", configuration: List.Configuration<T, TSession>, initial: T[] | undefined): List<T>
	create<T>(type: "object", configuration: Object.Configuration<T, TSession>, initial: T): Object<T>
	create<T>(type: "record", configuration: Record.Configuration<T, TSession>, initial: T): Record<T>
	create<T>(
		...argument:
			| ["list", List.Configuration<T, TSession>, T[] | undefined]
			| ["object", Object.Configuration<T, TSession>, T]
			| ["record", Record.Configuration<T, TSession>, T]
	): Object<T> | Record<T> | List<T> {
		const result =
			argument[0] == "object"
				? new Handler.Object(this, argument[1], argument[2])
				: argument[0] == "record"
				? new Handler.Record(this, argument[1], argument[2])
				: new Handler.List(this, argument[1], argument[2])
		this.handlers.set(result.session, result)
		this.handlers.created.set(result.session, result)

		if (this.ready) {
			for (const started of this.handlers.started.keys())
				this.start(started, result.session as Listenable<any>)
			result.start()
		}
		return result.session
	}
	start<T extends Listenable<any>>(session: T, target?: Listenable<any>): T {
		if (!this.#session)
			this.#session = session as any
		this.handlers.created.forEach(handler => {
			this.handlers.created.delete(handler.session)
			handler.start(target)
			this.handlers.started.set(handler.session, handler)
		})
		return session
	}
	reload<T>(object: Object<T>, property: string): void
	reload<T>(record: Record<T>, property: string): void
	reload<T>(list: List<T>, event: "change"): void
	reload<T>(session: Object<T> | Record<T> | List<T>, event: string): void {
		this.handlers.get(session)?.reload(event)
	}
	static create<TSession extends Listenable<globalThis.Record<string | number, any>>>(): Factory<TSession> {
		return new this<TSession>()
	}
}
export namespace Factory {}
