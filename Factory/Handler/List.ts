import { typedly } from "typedly"
import { List as SessionlyList } from "../../List/index"
import { Listenable } from "../../Listenable"
import type { Factory } from "../index"
import { navigation } from "../navigation"
import { Handler as Base } from "./Base"

export class ListHandler<T> extends Base<SessionlyList<T>> {
	private backend: () => T[] | undefined
	private configuration: ListHandler.Configuration<SessionlyList.Configuration<any>>
	constructor(factory: Factory, configuration: SessionlyList.Configuration<T>, backend: T[] | undefined) {
		const processed = ListHandler.processConfiguration(configuration)
		const { result, ...internals } = SessionlyList.create(processed, backend, factory)
		super(factory, result)
		this.backend = internals.backend
		this.configuration = processed as any
	}
	start(target?: Listenable<any>): void {
		const backend = this.backend() ?? []
		for (const path of this.configuration?.invalidate ?? [])
			if (typeof path == "string") {
				const dependency = navigation.resolve(this.factory, backend, path)
				if (dependency && (!target || target === dependency.target)) {
					const callback = () => {
						controllers.read.abort()
						controllers.change.abort()
						dependency.target.listen(dependency.key, () => this.state.invalidate(), { passive: true })
					}
					const controllers = {
						read: this.state.listen("read", callback, { once: true, passive: true }),
						change: this.state.listen("change", callback, { once: true, passive: true }),
					}
				}
			}
		for (const path of this.configuration.reload ?? [])
			if (typeof path == "string") {
				const dependency = navigation.resolve(this.factory, backend, path)
				if (dependency && (!target || target === dependency.target)) {
					const callback = () => {
						controllers.change.abort()
						controllers.read.abort()
						dependency.target.listen(dependency.key, () => this.reload(), { passive: true })
					}
					const controllers = {
						change: this.state.listen("change", callback, { once: true, passive: true }),
						read: this.state.listen("read", callback, { once: true, passive: true }),
					}
				}
			}
	}

	reload(): void {
		const current = this.backend()
		const configuration = this.configuration
		if (configuration) {
			if (current === undefined)
				this.state.change(configuration.initiate?.({ state: this.factory.state, me: this.state, current }))
			configuration
				.load?.({ state: this.factory.state, me: this.state, current })
				.then(result => this.state.change(result))
		}
	}
	private static processConfiguration<T>(
		configuration: SessionlyList.Configuration<T>
	): ListHandler.Configuration<SessionlyList.Configuration<T>> {
		return {
			...(({ next, load, ...configuration }) => configuration)(configuration),
			...(configuration.load && {
				load: typedly.Promise.lazy<typeof configuration.load>(() =>
					typedly.Promise.awaitLatest(async (...argument) => configuration.load?.(...argument))
				),
			}),
			...(configuration.next && {
				next: typedly.Promise.lazy<typeof configuration.next>(() =>
					typedly.Promise.awaitLatest(async (...argument) => configuration.next?.(...argument))
				),
			}),
		}
	}
}
export namespace ListHandler {
	export type Configuration<TConfiguration extends SessionlyList.Configuration<any>> =
		TConfiguration extends SessionlyList.Configuration<infer T>
			? {
					[Configuration in keyof SessionlyList.Configuration<T>]?: Configuration extends "load" | "next"
						? typedly.Promise.Lazy<Required<SessionlyList.Configuration<T>>[Configuration]>
						: SessionlyList.Configuration<T>[Configuration]
			  }
			: never
}
