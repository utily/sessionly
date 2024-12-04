export interface Events<T> {
	read: [current: T[], event: "read"]
	push: [value: T, index: number, current: readonly T[], event: "push"]
	change: [current: readonly T[], event: "change"]
	replace: [value: T, index: number, old: T | undefined, current: readonly T[], event: "replace"]
	remove: [index: number, old: T | undefined, current: readonly T[], event: "remove"]
}
export namespace Events {}
