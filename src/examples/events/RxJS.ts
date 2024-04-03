import { FooEvent, sleep } from "../../utils";
import { probeMemory } from "../../benchmark/probe";
import { Options, RunContext } from "../../benchmark/types";
import { Observable, Subject, fromEvent, takeUntil } from "rxjs";
import { breadth } from "./_common";

export function setup(options: Options): void {}

export async function run({ depth }: RunContext): Promise<void> {
    const target = new EventTarget();
    const abort = new Subject<void>();
    const promised = new Promise<void>((resolve) => {
        recurse(target, depth)
            .pipe(takeUntil(abort))
            .subscribe({
                complete() {
                    resolve();
                },
            });
    });
    for (let i = 0; i < breadth; i++) {
        await Promise.resolve();
        target.dispatchEvent(new FooEvent());
    }
    await sleep(0);
    abort.next();
    await promised;
}

function recurse(target: EventTarget, depth: number): Observable<void> {
    return new Observable<void>((subscriber) => {
        const o = fromEvent(target, "foo");
        if (depth > 1) {
            const subTarget = new EventTarget();
            subscriber.add(
                o.subscribe(() => {
                    subTarget.dispatchEvent(new FooEvent());
                })
            );
            subscriber.add(recurse(subTarget, depth - 1).subscribe());
        } else {
            subscriber.add(
                o.subscribe(() => {
                    probeMemory("bottom");
                })
            );
        }
    });
}
