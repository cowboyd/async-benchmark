# JavaScript Async Patterns Benchmark

```
$ npm run perf

file                        time(ms)  heapUsed_start  heapUsed_bottom  heapDump_start  heapDump_bottom  heapDelta
events/addEventListener.js   1356.02        13.81 MB         15.35 MB        15.43 MB         15.65 MB  216.88 kB
events/RxJS.js               2800.64        15.21 MB         16.99 MB        16.95 MB         17.29 MB  340.19 kB
events/Effection.js         47280.29        14.33 MB         20.28 MB        16.01 MB         20.58 MB    4.57 MB

Platform: Darwin 23.2.0 arm64
Node.JS: 21.7.1
V8: 11.8.172.17-node.20
CPU: Apple M1 Max × 10
```
