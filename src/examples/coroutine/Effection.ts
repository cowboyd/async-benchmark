import { probeMemory } from "../../benchmark/probe";
import { Options, RunContext } from "../../benchmark/types";
import { breadth } from "./_common";
import { Operation, run as _run, call } from "effection";

export function setup(options: Options): void {}

export async function run({ depth }: RunContext): Promise<void> {
    const task = _run(() => recurse(depth));
    await task;
}

function* recurse(depth: number): Operation<void> {
    if (depth > 1) {
        yield* recurse(depth - 1);
    } else {
        for (let i = 0; i < breadth; i++) {
            yield* call(Promise.resolve());
        }
        probeMemory("bottom");
    }
}
