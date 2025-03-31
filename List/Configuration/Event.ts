import { http } from "cloudly-http"
import type { List } from "../index"
export namespace Event {
	export namespace Initiate {
		export interface Parameters<TValue, TSession> {
			session?: TSession
			me: List<TValue>
			current?: http.Continuable<TValue>
		}
		export type Return<TValue> = http.Continuable<TValue> | undefined
	}
	export namespace Load {
		export type Parameters<TValue, TSession> = Initiate.Parameters<TValue, TSession>
		export type Return<TValue> = Promise<http.Continuable<TValue> | undefined>
	}
	export namespace Push {
		export type Parameters<TValue, TSession> = Initiate.Parameters<TValue, TSession> & { value?: TValue }
		export type Return<TValue> = Promise<TValue | undefined>
	}
	export namespace Replace {
		export type Parameters<TValue, TSession> = Initiate.Parameters<TValue, TSession> &
			Exclude<Awaited<Return<TValue>>, undefined>
		export type Return<TValue> = Promise<{ index: number; value: TValue } | undefined>
	}
	export namespace Remove {
		export type Parameters<TValue, TSession> = Initiate.Parameters<TValue, TSession> &
			Exclude<Awaited<Return>, undefined>
		export type Return = Promise<{ index: number } | undefined>
	}
	export namespace Change {
		export type Parameters<TValue, TSession> = Initiate.Parameters<TValue, TSession> & {
			value?: http.Continuable<TValue>
		}
		export type Return<TValue> = Promise<http.Continuable<TValue> | undefined>
	}
	export namespace Next {
		export type Parameters<TValue, TSession> = Initiate.Parameters<TValue, TSession>
		export type Return<TValue> = Promise<http.Continuable<TValue> | undefined>
	}
}
