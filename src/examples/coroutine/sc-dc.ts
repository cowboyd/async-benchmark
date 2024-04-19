import { probeMemory } from "../../benchmark/probe";
import { Options, RunContext } from "../../benchmark/types";
import { breadth } from "./_common";
import { Operation, evaluate, reset, shift } from "../../implementation/sc-dc/index";

export function setup(options: Options): void {}

export async function run({ depth }: RunContext): Promise<void> {
  return new Promise((resolve, reject) => {
    evaluate(function*() {
      try {
        yield* reset(function*() {
          yield* recurse(depth);
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    })
  })
}

function* recurse(depth: number): Operation<void> {
  if (depth > 1) {
    yield* recurse(depth - 1);
  } else {
    yield* shift(function*() {
      for (let i = 0; i < breadth; i++) {
        yield* shift(function*(k, reenter) {
          Promise.resolve().then(() => reenter(k, void 0))
        });
      }
      probeMemory("bottom");
    });
  }
}
