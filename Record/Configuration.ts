import { DotNotation } from "../DotNotation"
import type { SessionlyRecord } from "./index"

export type Configuration<T, TState = any> = {
	readonly?: true
	initiate?: (parameters: {
		state?: TState
		me: SessionlyRecord<T>
		property: keyof T
		current?: T[keyof T]
	}) => T[keyof T] | undefined
	load?: (parameters: {
		state?: TState
		me: SessionlyRecord<T>
		property: keyof T
		current?: T[keyof T]
	}) => Promise<T[keyof T] | undefined>
	store?: (parameters: {
		state?: TState
		me: SessionlyRecord<T>
		property: keyof T
		current?: T[keyof T]
		value: T[keyof T] | undefined
	}) => Promise<T[keyof T] | undefined>
	invalidate?: DotNotation<TState>[]
	reload?: DotNotation<TState>[]
}
export namespace Configuration {}
