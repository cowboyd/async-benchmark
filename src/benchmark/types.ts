export interface Options {
    repeat: number;
    depth: number;
    time: number;
    file?: string;
    keep: boolean;
    timeout: number;
}

export type Example = {
    setup: Setup;
    run: Run;
};

export type RunContext = {
    n: number; // the nth run
    depth: number; // levels of recursion
};

export type Setup = (options: Options) => void;
export type Run = (context: RunContext) => Promise<void>;
