import type { List } from "./List"
import { Listenable } from "./Listenable"
import type { Object } from "./Object"
import type { Record } from "./Record"

type Mapping<T> = T extends Record.Symbol
	? { [key: keyof any]: Extract<Exclude<keyof T, keyof Listenable<any>> | "*", string | number> }
	: T extends Object.Symbol
	? {
			[Property in keyof T as string | number]: Property extends keyof Listenable<any>
				? never
				: Property extends string | number
				? T[Property] extends (...args: any[]) => any
					? `${Property}`
					: T[Property] extends List.Symbol
					? `${Property}.${keyof List.Events<any>}`
					: T[Property] extends Record.Symbol
					? `${Property}.${Extract<Exclude<keyof T[Property], keyof Listenable<any>> | "*", string | number>}`
					: T[Property] extends Object.Symbol
					? `${Property}.${DotNotation<T[Property]>}`
					: `${Property}`
				: never
	  }
	: never
export type DotNotation<T> = T extends string | number ? `${T}` : Mapping<T>[keyof Mapping<T>]
