import { typedly } from "typedly"
import { Listenable } from "../../Listenable"
import { Object } from "../../Object"
import type { Factory } from "../index"
import { navigation } from "../navigation"
import { Handler as Base } from "./Base"

export class ObjectHandler<T> extends Base<Object<T>> {
	private backend: () => T
	private configuration: ObjectHandler.Configuration<Object.Configuration<any, any>, any>
	constructor(factory: Factory, configuration: Object.Configuration<T>, backend: T) {
		const processed = ObjectHandler.processConfiguration(configuration)
		const { result, ...internals } = Object.create(processed, backend, factory)
		super(factory, result)
		this.backend = internals.backend
		this.configuration = processed as any
	}
	start(target?: Listenable<any>): void {
		const backend = this.backend()
		for (const [property, configuration] of typedly.Object.entries(this.configuration)) {
			for (const path of configuration?.invalidate ?? [])
				if (typeof path === "string") {
					const dependency = navigation.resolve(this.factory, backend, path)
					if (dependency && (!target || target === dependency.target))
						this.session.listen<keyof T>(
							property as keyof T,
							() =>
								dependency.target.listen(dependency.key, () => delete this.session[property as keyof T], {
									passive: true,
								}),
							{ passive: true, once: true, trigger: "read" }
						)
				}
			for (const path of configuration?.reload ?? []) {
				if (typeof path === "string") {
					const dependency = navigation.resolve(this.factory, backend, path)
					if (dependency && (!target || target === dependency.target)) {
						this.session.listen<keyof T>(
							property as keyof T,
							() => dependency.target.listen(dependency.key, () => this.reload(property as string), { passive: true }),
							{ passive: true, once: true, trigger: "read" }
						)
					}
				}
			}
		}
	}
	reload(event: string): void {
		const current = this.backend?.()[event as keyof T]
		const configuration = this.configuration[event]
		if (configuration) {
			if (current === undefined)
				this.session[event as keyof T] = configuration.initiate?.({
					session: this.factory.session,
					me: this.session,
					property: event as never,
					current,
				})
			configuration.load
				?.force({ session: this.factory.session, me: this.session, property: event as never, current })
				.then(result => (this.session[event as keyof T] = result))
		}
	}
	private static processConfiguration<T>(
		configuration: Object.Configuration<T, any>
	): ObjectHandler.Configuration<Object.Configuration<T, any>, any> {
		return typedly.Object.entries(configuration).reduce<
			Partial<ObjectHandler.Configuration<Object.Configuration<T, any>, any>>
		>((result, [property, configuration]) => {
			return {
				...result,
				[property]: {
					...(({ load, ...configuration }) => configuration)(configuration ?? { load: undefined }),
					...(configuration?.load && {
						load: typedly.Promise.lazy<typeof configuration.load>(
							() => typedly.Promise.awaitLatest(async argument => configuration.load?.({ ...argument })),
							argument => argument.property
						),
					}),
				},
			}
		}, {}) as ObjectHandler.Configuration<Object.Configuration<T, any>, any>
	}
}
export namespace ObjectHandler {
	export type Configuration<
		TConfiguration extends Object.Configuration<unknown>,
		TSession = unknown
	> = TConfiguration extends Object.Configuration<infer T>
		? {
				[Property in keyof TConfiguration]?: Property extends keyof T
					? {
							[Configuration in keyof Object.Configuration.Property<
								T,
								Property,
								T[Property],
								TSession
							>]?: Configuration extends "load"
								? typedly.Promise.Lazy<
										Required<Object.Configuration.Property<T, Property, T[Property], TSession>>["load"]
								  >
								: Object.Configuration.Property<T, Property, T[Property], TSession>[Configuration]
					  }
					: never
		  }
		: never
}
