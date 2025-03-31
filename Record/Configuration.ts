import { DotNotation } from "../DotNotation"
import type { SessionlyRecord } from "./index"

export type Configuration<T, TSession = any> = {
	readonly?: true
	initiate?: (parameters: {
		session?: TSession
		me: SessionlyRecord<T>
		property: keyof T
		current?: T[keyof T]
	}) => T[keyof T] | undefined
	load?: (parameters: {
		session?: TSession
		me: SessionlyRecord<T>
		property: keyof T
		current?: T[keyof T]
	}) => Promise<T[keyof T] | undefined>
	store?: (parameters: {
		session?: TSession
		me: SessionlyRecord<T>
		property: keyof T
		current?: T[keyof T]
		value: T[keyof T] | undefined
	}) => Promise<T[keyof T] | undefined>
	invalidate?: DotNotation<TSession>[]
	reload?: DotNotation<TSession>[]
}
export namespace Configuration {}
