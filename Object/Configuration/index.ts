import { Property as ConfigurationProperty } from "./Property"

export type Configuration<T, TSession = any> = {
	[Property in keyof T]?: Configuration.Property<T, Property, T[Property], TSession>
}
export namespace Configuration {
	export import Property = ConfigurationProperty
}
