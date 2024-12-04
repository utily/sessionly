import { Listenable } from "../../Listenable"
import type { Factory } from "../index"

export abstract class Handler<T = any> {
	protected constructor(protected factory: Factory, readonly state: T) {}
	abstract start(target?: Listenable<any>): void
	abstract reload(event: string): void
}
