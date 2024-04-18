import { probeMemory } from "../../benchmark/probe";
import { Options, RunContext } from "../../benchmark/types";
import { breadth } from "./_common";
import { evaluate, shift, star } from "../../implementation/sc-dc-bare-yield";

export function setup(options: Options): void {}

export async function run({ depth }: RunContext): Promise<void> {
  return new Promise((resolve, reject) => {
    evaluate(function*() {
      try {
	yield star(recurse(depth));
	resolve();
      } catch (error) {
	reject(error);
      }
    })
  })
}

function* recurse(depth: number) {
    if (depth > 1) {
      yield star(recurse(depth - 1));
    } else {
      for (let i = 0; i < breadth; i++) {
        yield shift(function*(k, reenter) {
	  Promise.resolve().then(() => reenter(k, void 0))
	});
      }
      probeMemory("bottom");
    }
}
