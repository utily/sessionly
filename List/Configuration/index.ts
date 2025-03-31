import { DotNotation } from "../../DotNotation"
import { Event as ConfigurationEvent } from "./Event"

export interface Configuration<TValue, TSession = any> {
	initiate?: (
		parameters: Configuration.Event.Initiate.Parameters<TValue, TSession>
	) => Configuration.Event.Initiate.Return<TValue>
	load?: (parameters: Configuration.Event.Load.Parameters<TValue, TSession>) => Configuration.Event.Load.Return<TValue>
	push?: (parameters: Configuration.Event.Push.Parameters<TValue, TSession>) => Configuration.Event.Push.Return<TValue>
	replace?: (
		parameters: Configuration.Event.Replace.Parameters<TValue, TSession>
	) => Configuration.Event.Replace.Return<TValue>
	remove?: (parameters: Configuration.Event.Remove.Parameters<TValue, TSession>) => Configuration.Event.Remove.Return
	invalidate?: DotNotation<TSession>[]
	change?: (
		parameters: Configuration.Event.Change.Parameters<TValue, TSession>
	) => Configuration.Event.Change.Return<TValue>
	reload?: DotNotation<TSession>[]
	next?: (parameters: Configuration.Event.Next.Parameters<TValue, TSession>) => Configuration.Event.Next.Return<TValue>
}
export namespace Configuration {
	export import Event = ConfigurationEvent
}
