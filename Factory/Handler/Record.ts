import { typedly } from "typedly"
import { Listenable } from "../../Listenable"
import { _Record } from "../../Record"
import type { Factory } from "../index"
import { navigation } from "../navigation"
import { Handler as Base } from "./Base"

export class RecordHandler<T> extends Base<_Record<T>> {
	private backend: () => T
	private listeners: Listenable.Listeners<_Record.ListenableParameters<T>>
	private configuration: RecordHandler.Configuration<_Record.Configuration<any>>
	constructor(factory: Factory, configuration: _Record.Configuration<T>, backend: T) {
		const processed = RecordHandler.processConfiguration(configuration)
		const { result, ...internals } = _Record.create(processed, backend, factory)
		super(factory, result)
		this.listeners = internals.listeners
		this.backend = internals.backend
		this.configuration = processed as any
	}
	start(target?: Listenable<any>): void {
		const configuration = this.configuration
		const backend = this.backend()
		if (backend == undefined)
			return
		for (const path of configuration?.invalidate ?? [])
			if (typeof path == "string") {
				const dependency = navigation.resolve(this.factory, backend, path)
				if (dependency && (!target || target === dependency.target)) {
					const memory = new Set<keyof T>()
					this.session.listen(
						"*",
						(value, property) => {
							if (!memory.has(property)) {
								memory.add(property)
								dependency.target.listen(dependency.key, () => delete this.session[property], { passive: true })
							}
						},
						{ passive: true, trigger: "read" }
					)
				}
			}
		for (const path of configuration?.reload ?? [])
			if (typeof path == "string") {
				const dependency = navigation.resolve(this.factory, backend, path)
				if (dependency && (!target || target === dependency.target)) {
					const activated = new Set<keyof T>()
					this.session.listen(
						"*",
						(_, property) => {
							if (!activated.has(property)) {
								activated.add(property)
								dependency.target.listen(dependency.key, () => this.reload(property as string), { passive: true })
							}
						},
						{ passive: true, trigger: "read" }
					)
				}
			}
	}
	reload(event: string): void {
		if (event === "*")
			this.listeners.events.forEach(property => property !== "*" && this.reload(property as string))
		else {
			let current = this.backend()[event as keyof T]
			if (this.configuration) {
				if (current === undefined)
					current = this.session[event as keyof T] = this.configuration.initiate?.({
						session: this.factory.session,
						me: this.session,
						property: event,
						current,
					})
				this.configuration.load
					?.force({ session: this.factory.session, me: this.session, property: event, current })
					.then(result => (this.session[event as keyof T] = result))
			}
		}
	}
	private static processConfiguration<T>(
		configuration: _Record.Configuration<T>
	): RecordHandler.Configuration<_Record.Configuration<T>> {
		return {
			...(({ load, ...configuration }) => configuration)(configuration),
			...(configuration.load && {
				load: typedly.Promise.lazy<typeof configuration.load>(
					() => typedly.Promise.awaitLatest(async (...argument) => configuration.load?.(...argument)),
					argument => argument.property
				),
			}),
		}
	}
}
export namespace RecordHandler {
	export type Configuration<TConfiguration extends _Record.Configuration<any>> =
		TConfiguration extends _Record.Configuration<infer T>
			? {
					[Configuration in keyof _Record.Configuration<T>]?: Configuration extends "load"
						? typedly.Promise.Lazy<Required<_Record.Configuration<T>>["load"]>
						: _Record.Configuration<T>[Configuration]
			  }
			: never
}
