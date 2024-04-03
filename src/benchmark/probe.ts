import { MemorySnapshot } from "./memory.js";
import { config as memlabConfig } from "@memlab/core";

let memoryProbeEnabled = false;

export function setupProbes(): void {
    memlabConfig.muteConsole = true;
}

export function enableMemoryProbe(enabled: boolean): void {
    memoryProbeEnabled = enabled;
}

const memorySnapshots: Array<MemorySnapshot> = [];
const memorySnapshotsTags = new Set<string>();

export function probeMemory(tag: string): void {
    if (memoryProbeEnabled && !memorySnapshotsTags.has(tag)) {
        memorySnapshotsTags.add(tag);
        memorySnapshots.push(MemorySnapshot.create(tag));
    }
}

export function collectMemorySnapshots(): Array<MemorySnapshot> {
    memorySnapshotsTags.clear();
    return memorySnapshots.splice(0);
}
