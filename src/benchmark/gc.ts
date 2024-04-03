/* eslint-disable @typescript-eslint/no-var-requires */

// GC utility borrowed from
// https://gist.github.com/mhofman/e4031aa4cd2375d0f151f62691724475

export const gc: () => void = (() => {
    if (globalThis.gc) return globalThis.gc;
    try {
        const v8 = require("v8");
        const vm = require("vm");
        v8.setFlagsFromString("--expose_gc");
        try {
            return vm.runInNewContext("gc");
        } finally {
            v8.setFlagsFromString("--no-expose_gc");
        }
    } catch (err) {
        return () => void Array.from({ length: 2 ** 24 }, () => Math.random());
    }
})();

export function queueGCJob() {
    return Promise.resolve();
}
