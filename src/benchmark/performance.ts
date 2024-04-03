import * as os from "node:os";
import * as path from "node:path";
import * as process from "node:process";
import * as cp from "node:child_process";
import { performance, PerformanceMeasure } from "node:perf_hooks";

import fg from "fast-glob";
import table from "text-table";
import { Command, Option } from "commander";

import type { Example, Options, RunContext } from "./types.js";
import { inspect } from "node:util";
import {
    collectMemorySnapshots,
    enableMemoryProbe,
    probeMemory,
    setupProbes,
} from "./probe.js";
import { MemorySnapshot } from "./memory.js";
import { InvalidOutputError, TimeoutError } from "./errors.js";

void main();

function addOptions(command: Command): Command {
    const int = (o: string) => parseInt(o);
    // prettier-ignore
    return command
        .addOption(new Option("-n, --repeat <number>", "number of times to repeat executing each JS file").default(100000).argParser(int))
        .addOption(new Option("-d, --depth <number>", "number of levels of recursion per example run").default(100).argParser(int))
        .addOption(new Option("-t, --time <ms>", "number of ms for each I/O operation").default(10).argParser(int))
        .addOption(new Option("-f, --file <file>", "JS file to be measured").hideHelp(true))
        .addOption(new Option("-k, --keep", "keep heap snapshots").default(false))
        .addOption(new Option("--timeout <ms>", "number of ms to timeout measuring each file (all repeated runs combined)").hideHelp(true).argParser(int));
}

async function main() {
    setupProbes();
    const program = addOptions(new Command()).version("0.0.1").parse();
    const options = program.opts<Options>();
    const { args } = program;

    if (options.file) {
        console.log(JSON.stringify(await perf(options)));
    } else {
        const dir = path.resolve(__dirname, "..", "examples");
        const p = args.map((p) => path.join(dir, p + ".js"));
        const files = (await fg(p)).filter(
            (f) => !path.basename(f).startsWith("_")
        );

        const results = await measureFiles(files, options);

        console.log(
            `\nresults for ${options.repeat} parallel executions, ${options.time}ms per I/O op\n`
        );

        await printMeasurementResults(dir, results);
        printPlatform();

        if (!options.keep) {
            for (const result of results) {
                if (result.err) continue;
                for (const snapshot of result.memory) {
                    await snapshot.unlink();
                }
            }
        }
    }
}

async function printMeasurementResults(
    dir: string,
    results: MeasurementResult[]
): Promise<void> {
    const { filesize } = await import("filesize");
    results = results.filter((result) => {
        if (result.err) {
            console.error(inspect(result));
        }
        return !result.err;
    });
    if (!results.length) return;
    results = results.sort(function (r1, r2) {
        return r1.timing.duration - r2.timing.duration;
    });

    const marks: string[] = [];
    for (const perf of results) {
        for (const { tag } of perf.memory) {
            if (marks.indexOf(tag) < 0) {
                marks.push(tag);
            }
        }
    }

    const rows = [
        [
            "file",
            "time(ms)",
            ...marks.map((m) => `heapUsed_${m}`),
            ...marks.map((m) => `heapDump_${m}`),
            "heapDelta",
        ],
    ];
    for (const result of results) {
        const heapDelta = delta(
            ...(await Promise.all(result!.memory.map((m) => m.getHeapSize())))
        );
        rows.push([
            path.relative(dir, result.file),
            (Math.round(result!.timing.duration * 100) / 100).toString(),
            ...result!.memory.map(
                (m) =>
                    filesize(
                        m.memoryUsage.heapUsed + m.memoryUsage.arrayBuffers
                    ) as string
            ),
            ...(await Promise.all(
                result!.memory.map(
                    async (m) => filesize(await m.getHeapSize()) as string
                )
            )),
            filesize(heapDelta) as string,
        ]);
    }

    console.log(
        table(rows, {
            align: [
                "l",
                "r",
                ...marks.map<"r">(() => `r`),
                ...marks.map<"r">(() => `r`),
                "r",
            ],
        })
    );
}

function delta(...n: number[]): number {
    if (!n.length) return 0;
    const max = Math.max.apply(undefined, n);
    const min = Math.min.apply(undefined, n);
    return max - min;
}

function printPlatform(): void {
    const plat = `Platform: ${os.type()} ${os.release()} ${os.arch()}`;
    const node = `Node.JS: ${process.versions.node}`;
    const v8 = `V8: ${process.versions.v8}`;
    const cpus =
        "CPU: " +
        Object.entries(
            os
                .cpus()
                .map(function (cpu) {
                    return cpu.model;
                })
                .reduce(function (o, model) {
                    if (!o[model]) o[model] = 0;
                    o[model]++;
                    return o;
                }, {} as Record<string, number>)
        )
            .map(([key, value]) => `${key} \u00d7 ${value}`)
            .join("\n");
    console.log(`\n${plat}\n${node}\n${v8}\n${cpus}\n`);
}

type PerformanceResult = {
    timing: PerformanceMeasure;
    memory: MemorySnapshot[];
    errs: number;
    lastErr: null | SerializedError;
};

async function perf(options: Options): Promise<PerformanceResult> {
    const result: Partial<PerformanceResult> = {};

    const file = path.resolve(process.cwd(), options.file!);

    const { setup, run } = (await import(file)) as Example;

    enableMemoryProbe(true);

    setup(options);

    const context: RunContext = { n: 0, depth: options.depth };

    probeMemory("start");
    await run(context);

    enableMemoryProbe(false);

    const warmUpRepeat = Math.min(350, options.repeat);
    for (let i = 0; i < warmUpRepeat; ++i) {
        context.n = i;
        await run(context);
    }

    performance.mark("perf_start");

    for (let i = 0; i < options.repeat; ++i) {
        try {
            await run(context);
        } catch (err) {
            result.lastErr = serializeError(err);
            result.errs = result.errs ? result.errs + 1 : 1;
        }
    }

    performance.mark("perf_end");
    result.timing = performance.measure("perf", "perf_start", "perf_end");
    result.memory = collectMemorySnapshots();

    return <PerformanceResult>result;
}

type SerializedError = { name: string; message: string; stack?: string };

function serializeError(err: any): null | SerializedError {
    if (!err || !err.name || !err.message) return null;
    const { name, message, stack } = err as Error;
    return { name, message, stack };
}

type MeasurementResult = PerformanceResult & {
    file: string;
    err?: Error;
};

async function forkAndMeasureSingleFile(
    file: string,
    options: Options
): Promise<PerformanceResult> {
    return new Promise((resolve, reject) => {
        console.log("benchmarking", file);
        const argsFork: string[] = [
            "--expose-gc",
            __filename,
            "--repeat",
            options.repeat.toString(),
            "--depth",
            options.depth.toString(),
            "--time",
            options.time.toString(),
            "--file",
            file,
        ];

        const p = cp.spawn(process.execPath, argsFork);

        let output = "";

        let clearTimer: (() => void) | undefined;
        if (options.timeout) {
            const timer = setTimeout(() => {
                p.kill();
                finalize(new TimeoutError());
            }, options.timeout);
            clearTimer = () => {
                clearTimer = undefined;
                clearTimeout(timer);
            };
        }

        p.stdout.addListener("data", onData);
        p.stdout.addListener("end", onEnd);
        p.stdout.pipe(process.stderr);
        p.stderr.pipe(process.stderr);

        function onData(data: string): void {
            output += data;
        }

        function onEnd(): void {
            try {
                const result = JSON.parse(output) as PerformanceResult;
                result.memory = result.memory.map(m => MemorySnapshot.from(m));
                finalize(null, result);
            } catch (err: any) {
                finalize(new InvalidOutputError(err));
            }
        }

        function finalize(err?: any, result?: PerformanceResult): void {
            clearTimer && clearTimer();
            p.stdout.removeAllListeners();
            if (err) reject(err);
            else resolve(result!);
        }
    });
}

async function measureFiles(
    files: string[],
    options: Options
): Promise<Array<MeasurementResult>> {
    const results: Array<MeasurementResult> = [];
    for (const file of files) {
        const result: Partial<MeasurementResult> = { file };
        try {
            Object.assign(
                result,
                await forkAndMeasureSingleFile(file, options)
            );
        } catch (err) {
            result.err = err as Error;
        }
        results.push(result as MeasurementResult);
    }
    return results;
}
