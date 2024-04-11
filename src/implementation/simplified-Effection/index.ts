export function run<T>(block: () => Operation<T>): Promise<T> {
    let resolve!: (value: T) => void;
    let reject!: (err: Error) => void;
    const promise = new Promise<T>((r, j) => (resolve = r, reject = j));
    const stack: Thunk[] = [new Run(block, resolve, reject)];
    evaluate(stack);
    return promise;
}

export function* call<T>(promise: PromiseLike<T>): Operation<T> {
    return (yield { type: Instruction.Type.Await, promise }) as T;
}

function evaluate(stack: Thunk[]): void {
    let running = true;
    try {
        while (stack.length) {
            const thunk = stack.pop()!;
            if (thunk instanceof Run) {
                const { block, resolve, reject } = thunk;
                let iterator!: Iterator<Instruction, unknown>;
                try {
                    iterator = block()[Symbol.iterator]();
                } catch(err) {
                    reject(err as Error);
                }
                stack.push(new Resume(new Routine<unknown>(iterator, resolve, reject)));
            } else if (thunk instanceof Resume) {
                const { routine, result } = thunk;
                const { iterator, resolve, reject } = routine;
                try {
                    const _result = !result ? iterator.next() : result.ok ? iterator.next(result.value as any) : iterator.throw!(result.err);
                    if (_result.done) {
                        resolve(_result.value);
                    } else {
                        const inst = _result.value;
                        switch (inst.type) {
                            case Instruction.Type.Await: {
                                const { promise } = inst;
                                promise.then(
                                    function onResolve(value: unknown) {
                                        stack.push(new Resume(routine, Ok(value)));
                                        if (!running) {
                                            evaluate(stack);
                                        }
                                    },
                                    function onReject(err: Error) {
                                        stack.push(new Resume(routine, Err(err)));
                                        if (!running) {
                                            evaluate(stack);
                                        }
                                    }
                                );
                                break;
                            }
                        }
                    }
                } catch (err) {
                    reject(err as Error);
                }
            }
        }
    } finally {
        running = false;
    }
}

export interface Operation<T> {
    [Symbol.iterator](): Iterator<Instruction, T>;
}

type Thunk = Run | Resume;

class Run {
    constructor(
        public block: () => Operation<any>,
        public resolve: (value: any) => void,
        public reject: (err: Error) => void,
    ) {}
}

class Resume {
    constructor(public routine: Routine<unknown>, public result?: Result<unknown>) {}
}

class Routine<T> {
    constructor(
        public iterator: Iterator<Instruction, T>,
        public resolve: (value: T) => void,
        public reject: (err: Error) => void,
        public parent?: Routine<unknown>
    ) {}
}

type Instruction = {
    type: Instruction.Type.Await,
    promise: PromiseLike<unknown>,
};

namespace Instruction {
    export const enum Type {
        Await,
    }
}

type Result<T> = { ok: true, value: T } | { ok: false, err: Error };

function Ok<T>(value: T): Result<T> {
    return { ok: true, value };
}

function Err<T = unknown>(err: Error): Result<T> {
    return { ok: false, err };
}
