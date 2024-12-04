import { DotNotation } from "../../DotNotation"
import { Event as ConfigurationEvent } from "./Event"

export interface Configuration<TValue, TState = any> {
	initiate?: (
		parameters: Configuration.Event.Initiate.Parameters<TValue, TState>
	) => Configuration.Event.Initiate.Return<TValue>
	load?: (parameters: Configuration.Event.Load.Parameters<TValue, TState>) => Configuration.Event.Load.Return<TValue>
	push?: (parameters: Configuration.Event.Push.Parameters<TValue, TState>) => Configuration.Event.Push.Return<TValue>
	replace?: (
		parameters: Configuration.Event.Replace.Parameters<TValue, TState>
	) => Configuration.Event.Replace.Return<TValue>
	remove?: (parameters: Configuration.Event.Remove.Parameters<TValue, TState>) => Configuration.Event.Remove.Return
	invalidate?: DotNotation<TState>[]
	change?: (
		parameters: Configuration.Event.Change.Parameters<TValue, TState>
	) => Configuration.Event.Change.Return<TValue>
	reload?: DotNotation<TState>[]
	next?: (parameters: Configuration.Event.Next.Parameters<TValue, TState>) => Configuration.Event.Next.Return<TValue>
}
export namespace Configuration {
	export import Event = ConfigurationEvent
}
