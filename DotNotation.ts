import type { List } from "./List"
import { Listenable } from "./Listenable"
import type { _Object } from "./Object"
import type { _Record } from "./Record"

type Mapping<T> = T extends _Record.Symbol
	? { [key: keyof any]: Extract<Exclude<keyof T, keyof Listenable<any>> | "*", string | number> }
	: T extends _Object.Symbol
	? {
			[Property in keyof T as string | number]: Property extends keyof Listenable<any>
				? never
				: Property extends string | number
				? T[Property] extends (...args: any[]) => any
					? `${Property}`
					: T[Property] extends List.Symbol
					? `${Property}.${keyof List.Events<any>}`
					: T[Property] extends _Record.Symbol
					? `${Property}.${Extract<Exclude<keyof T[Property], keyof Listenable<any>> | "*", string | number>}`
					: T[Property] extends _Object.Symbol
					? `${Property}.${DotNotation<T[Property]>}`
					: `${Property}`
				: never
	  }
	: never
export type DotNotation<T> = T extends string | number ? `${T}` : Mapping<T>[keyof Mapping<T>]
