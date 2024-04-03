import { isObject } from "underscore";

/**
 * Test if a value is a Thenable object. A Thenable object can be resolved to an
 * asynchronous completion record with `Promise.resolve(obj)` or `await obj`.
 * @param obj is a value to test
 * @returns true if obj is a Thenable object
 */
export function isPromiseLike<T = any>(obj: any): obj is PromiseLike<T> {
    return isObject(obj) && typeof obj.then === "function";
}
