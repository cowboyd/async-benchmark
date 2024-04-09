import { probeMemory } from "../../benchmark/probe";
import { Options, RunContext } from "../../benchmark/types";
import { breadth } from "./_common";
import { co } from "co";

export function setup(options: Options): void {}

export async function run({ depth }: RunContext): Promise<void> {
    await co(recurse, depth);
}

function* recurse(depth: number) {
    if (depth > 1) {
        yield recurse(depth - 1);
    } else {
        for (let i = 0; i < breadth; i++) {
            yield Promise.resolve();
        }
        probeMemory("bottom");
    }
}
