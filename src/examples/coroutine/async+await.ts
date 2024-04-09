import { probeMemory } from "../../benchmark/probe";
import { Options, RunContext } from "../../benchmark/types";
import { breadth } from "./_common";

export function setup(options: Options): void {}

export async function run({ depth }: RunContext): Promise<void> {
    await recurse(depth);
}

async function recurse(depth: number): Promise<void> {
    if (depth > 1) {
        await recurse(depth - 1);
    } else {
        for (let i = 0; i < breadth; i++) {
            await Promise.resolve();
        }
        probeMemory("bottom");
    }
}
