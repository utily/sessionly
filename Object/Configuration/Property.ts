import { DotNotation } from "../../DotNotation"
import type { SessionlyObject } from "../index"

export interface Property<T, TProperty extends keyof T, TValue extends T[TProperty] = T[TProperty], TState = any> {
	readonly?: true
	initiate?: (parameters: {
		state?: unknown
		me: SessionlyObject<T>
		property: TProperty
		current?: TValue
	}) => TValue | undefined
	load?: (parameters: {
		state?: TState
		me: SessionlyObject<T>
		property: TProperty
		current?: TValue
	}) => Promise<TValue | undefined>
	store?: (parameters: {
		state?: TState
		me: SessionlyObject<T>
		property: TProperty
		current?: TValue
		value: TValue | undefined
	}) => Promise<TValue | undefined>
	invalidate?: DotNotation<TState>[]
	reload?: DotNotation<TState>[]
}

export namespace Property {}
