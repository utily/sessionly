import { Property as ConfigurationProperty } from "./Property"

export type Configuration<T, TState = any> = {
	[Property in keyof T]?: Configuration.Property<T, Property, T[Property], TState>
}
export namespace Configuration {
	export import Property = ConfigurationProperty
}
