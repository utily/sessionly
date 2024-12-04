import { Handler as Base } from "./Base"
import { ListHandler as HandlerList } from "./List"
import { ObjectHandler as HandlerObject } from "./Object"
import { RecordHandler as HandlerRecord } from "./Record"

export type Handler = Base
export namespace Handler {
	export import List = HandlerList
	export import Object = HandlerObject
	export import Record = HandlerRecord
}
