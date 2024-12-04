import { typedly } from "../../typedly"
import { List } from "../List"
import { Listenable } from "../Listenable"
import { SessionlyObject } from "../Object"
import { SessionlyRecord } from "../Record"
import { Handler } from "./Handler"

export class Factory<
	TState extends Listenable<globalThis.Record<string | number, any>> = Listenable<
		globalThis.Record<string | number, any>
	>
> {
	#state?: TState | undefined
	get state(): TState | undefined {
		return this.#state
	}
	get ready(): boolean {
		return this.#state !== undefined
	}
	private readonly handlers = globalThis.Object.assign(
		new typedly.IterableWeakMap<SessionlyObject<any> | SessionlyRecord<any> | List<any>, Handler>(),
		{
			created: new typedly.IterableWeakMap<SessionlyObject<any> | SessionlyRecord<any> | List<any>, Handler>(),
			started: new typedly.IterableWeakMap<SessionlyObject<any> | SessionlyRecord<any> | List<any>, Handler>(),
		}
	)

	private constructor() {}

	create<T>(type: "list", configuration: List.Configuration<T, TState>, initial: T[] | undefined): List<T>
	create<T>(type: "object", configuration: SessionlyObject.Configuration<T, TState>, initial: T): SessionlyObject<T>
	create<T>(type: "record", configuration: SessionlyRecord.Configuration<T, TState>, initial: T): SessionlyRecord<T>
	create<T>(
		...argument:
			| ["list", List.Configuration<T, TState>, T[] | undefined]
			| ["object", SessionlyObject.Configuration<T, TState>, T]
			| ["record", SessionlyRecord.Configuration<T, TState>, T]
	): SessionlyObject<T> | SessionlyRecord<T> | List<T> {
		const result =
			argument[0] == "object"
				? new Handler.Object(this, argument[1], argument[2])
				: argument[0] == "record"
				? new Handler.Record(this, argument[1], argument[2])
				: new Handler.List(this, argument[1], argument[2])
		this.handlers.set(result.state, result)
		this.handlers.created.set(result.state, result)

		if (this.ready) {
			for (const started of this.handlers.started.keys())
				this.start(started, result.state as Listenable<any>)
			result.start()
		}
		return result.state
	}
	start<T extends Listenable<any>>(state: T, target?: Listenable<any>): T {
		if (!this.#state)
			this.#state = state as any
		this.handlers.created.forEach(handler => {
			this.handlers.created.delete(handler.state)
			handler.start(target)
			this.handlers.started.set(handler.state, handler)
		})
		return state
	}
	reload<T>(object: SessionlyObject<T>, property: string): void
	reload<T>(record: SessionlyRecord<T>, property: string): void
	reload<T>(list: List<T>, event: "change"): void
	reload<T>(state: SessionlyObject<T> | SessionlyRecord<T> | List<T>, event: string): void {
		this.handlers.get(state)?.reload(event)
	}
	static create<TState extends Listenable<globalThis.Record<string | number, any>>>(): Factory<TState> {
		return new this<TState>()
	}
}
export namespace Factory {}
