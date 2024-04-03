import { FooEvent, sleep } from "../../utils";
import { probeMemory } from "../../benchmark/probe";
import { Options, RunContext } from "../../benchmark/types";
import { breadth } from "./_common";
import { Operation, run as _run, each, on, spawn } from "effection";

export function setup(options: Options): void {}

export async function run({ depth }: RunContext): Promise<void> {
    const target = new EventTarget();
    const task = _run(() => recurse(target, depth));
    for (let i = 0; i < breadth; i++) {
        await Promise.resolve();
        target.dispatchEvent(new FooEvent());
    }
    await sleep(0);
    await task.halt()
}

function* recurse(target: EventTarget, depth: number): Operation<void> {
    const eventStream = on(target, 'foo');
    if (depth > 1) {
        const subTarget = new EventTarget();
        yield* spawn(() => recurse(subTarget, depth - 1));
        for (const _ of yield* each(eventStream)) {
            subTarget.dispatchEvent(new FooEvent());
            yield* each.next();
        }
    } else {
        for (const _ of yield* each(eventStream)) {
            probeMemory("bottom");
            yield* each.next();
        }
    }
}
