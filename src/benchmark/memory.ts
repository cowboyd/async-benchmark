import { gc } from "./gc.js";
import { unlink } from "fs/promises";
import { dumpNodeHeapSnapshot, utils, IHeapSnapshot } from "@memlab/core";

export type IMemorySnapshot = {
    tag: string;
    heapSnapshotFile: string;
    memoryUsage: NodeJS.MemoryUsage;
};

export class MemorySnapshot implements IMemorySnapshot {
    public heapSnapshotFile!: string;
    public memoryUsage!: NodeJS.MemoryUsage;

    private _heapSize?: number;
    private _heapSnapshot?: IHeapSnapshot;

    private constructor(public tag: string) {}

    public static create(tag: string): MemorySnapshot {
        const ss = new MemorySnapshot(tag);
        gc();
        ss.memoryUsage = process.memoryUsage();
        ss.heapSnapshotFile = dumpNodeHeapSnapshot();
        return ss;
    }

    public static from({
        tag,
        heapSnapshotFile,
        memoryUsage,
    }: IMemorySnapshot): MemorySnapshot {
        const ss = new MemorySnapshot(tag);
        ss.heapSnapshotFile = heapSnapshotFile;
        ss.memoryUsage = memoryUsage;
        return ss;
    }

    public async getHeapSize(): Promise<number> {
        if (typeof this._heapSize === "undefined") {
            const heap = await this.getHeapSnapshot();
            this._heapSize = 0;
            heap.nodes.forEach((node) => {
                this._heapSize! += node.self_size;
            });
        }
        return this._heapSize;
    }

    public async getHeapSnapshot(): Promise<IHeapSnapshot> {
        if (!this._heapSnapshot) {
            this._heapSnapshot = await utils.getSnapshotFromFile(
                this.heapSnapshotFile,
                {
                    buildNodeIdIndex: true,
                }
            );
        }
        return this._heapSnapshot;
    }

    public unlink(): Promise<void> {
        return unlink(this.heapSnapshotFile);
    }
}
