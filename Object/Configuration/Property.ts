import { DotNotation } from "../../DotNotation"
import type { _Object } from "../index"

export interface Property<T, TProperty extends keyof T, TValue extends T[TProperty] = T[TProperty], TSession = any> {
	readonly?: true
	initiate?: (parameters: {
		session?: unknown
		me: _Object<T>
		property: TProperty
		current?: TValue
	}) => TValue | undefined
	load?: (parameters: {
		session?: TSession
		me: _Object<T>
		property: TProperty
		current?: TValue
	}) => Promise<TValue | undefined>
	store?: (parameters: {
		session?: TSession
		me: _Object<T>
		property: TProperty
		current?: TValue
		value: TValue | undefined
	}) => Promise<TValue | undefined>
	invalidate?: DotNotation<TSession>[]
	reload?: DotNotation<TSession>[]
}

export namespace Property {}
