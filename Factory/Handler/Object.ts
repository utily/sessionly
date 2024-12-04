import { typedly } from "typedly"
import { Listenable } from "../../Listenable"
import { SessionlyObject } from "../../Object"
import type { Factory } from "../index"
import { navigation } from "../navigation"
import { Handler as Base } from "./Base"

export class ObjectHandler<T> extends Base<SessionlyObject<T>> {
	private backend: () => T
	private configuration: ObjectHandler.Configuration<SessionlyObject.Configuration<any, any>, any>
	constructor(factory: Factory, configuration: SessionlyObject.Configuration<T>, backend: T) {
		const processed = ObjectHandler.processConfiguration(configuration)
		const { result, ...internals } = SessionlyObject.create(processed, backend, factory)
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
						this.state.listen<keyof T>(
							property as keyof T,
							() =>
								dependency.target.listen(dependency.key, () => delete this.state[property as keyof T], {
									passive: true,
								}),
							{ passive: true, once: true, trigger: "read" }
						)
				}
			for (const path of configuration?.reload ?? []) {
				if (typeof path === "string") {
					const dependency = navigation.resolve(this.factory, backend, path)
					if (dependency && (!target || target === dependency.target)) {
						this.state.listen<keyof T>(
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
				this.state[event as keyof T] = configuration.initiate?.({
					state: this.factory.state,
					me: this.state,
					property: event as never,
					current,
				})
			configuration.load
				?.force({ state: this.factory.state, me: this.state, property: event as never, current })
				.then(result => (this.state[event as keyof T] = result))
		}
	}
	private static processConfiguration<T>(
		configuration: SessionlyObject.Configuration<T, any>
	): ObjectHandler.Configuration<SessionlyObject.Configuration<T, any>, any> {
		return typedly.Object.entries(configuration).reduce<
			Partial<ObjectHandler.Configuration<SessionlyObject.Configuration<T, any>, any>>
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
		}, {}) as ObjectHandler.Configuration<SessionlyObject.Configuration<T, any>, any>
	}
}
export namespace ObjectHandler {
	export type Configuration<
		TConfiguration extends SessionlyObject.Configuration<unknown>,
		TState = unknown
	> = TConfiguration extends SessionlyObject.Configuration<infer T>
		? {
				[Property in keyof TConfiguration]?: Property extends keyof T
					? {
							[Configuration in keyof SessionlyObject.Configuration.Property<
								T,
								Property,
								T[Property],
								TState
							>]?: Configuration extends "load"
								? typedly.Promise.Lazy<
										Required<SessionlyObject.Configuration.Property<T, Property, T[Property], TState>>["load"]
								  >
								: SessionlyObject.Configuration.Property<T, Property, T[Property], TState>[Configuration]
					  }
					: never
		  }
		: never
}
