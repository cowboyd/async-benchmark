import { probeMemory } from "../../benchmark/probe";
import { Options, RunContext } from "../../benchmark/types";
import { Observable, defer, from, repeat } from "rxjs";
import { breadth } from "./_common";

export function setup(options: Options): void {}

export async function run({ depth }: RunContext): Promise<void> {
    await new Promise<void>((resolve) => {
        recurse(depth)
            .subscribe({
                complete() {
                    resolve();
                },
            });
    });
}

function recurse(depth: number): Observable<void> {
    return new Observable<void>((subscriber) => {
        if (depth > 1) {
            subscriber.add(recurse(depth - 1).subscribe({
                complete() {
                    subscriber.complete();
                }
            }));
        } else {
            subscriber.add(
                defer(() => from(Promise.resolve()))
                    .pipe(repeat(breadth))
                    .subscribe({
                        complete() {
                            probeMemory("bottom");
                            subscriber.complete();
                        }
                    })
            );
        }
    });
}
