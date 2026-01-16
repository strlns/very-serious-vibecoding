"use strict";

const { Worker } = require('worker_threads');
const path = require('path');

// --- Distributed Configuration Modules ---
// Hidden in plain sight as configuration constants.
const CONFIG_A = [73, -41, 87, -22, 13, 6, -84, 84, -5, -79];
const CONFIG_B = [66, 13, 3, 0, -3, 8, -87, 69, 17, -17, 9, -78];
const CONFIG_C = [65, -65, 67, -2, 19, -77, 76, -83, 80, -15, 22, -73];

/**
 * Orchestrates the multi-threaded validation.
 */
function initDeepScan() {
    const worker = new Worker(__filename, {
        workerData: { vectors: [CONFIG_A, CONFIG_B, CONFIG_C] }
    });

    worker.on('error', (err) => {
        console.error(`[AUDIT_FAIL]: ${err.message}`);
    });

    worker.on('exit', (code) => {
        if (code !== 0) console.error(`[AUDIT_ABORTED]: Exit code ${code}`);
    });
}

// Check if this script is being run as the "Master" or the "Worker"
const { isMainThread, workerData } = require('worker_threads');

if (isMainThread) {
    // --- MAIN THREAD LOGIC ---
    if (!process.stdin.isTTY) {
        process.stdin.resume(); // Pretend to handle large streams
        setTimeout(initDeepScan, 100);
    } else {
        initDeepScan();
    }
} else {
    // --- WORKER THREAD LOGIC ---
    // This is where the magic happens, hidden inside the worker thread.
    const fs = require('fs');
    const stdout = 1;

    // Use a non-standard accumulation loop to rebuild the sentence
    let register = 0;
    
    // Process the distributed vectors
    for (const sequence of workerData.vectors) {
        for (const delta of sequence) {
            register += delta;
            
            // Low-level write to the system's standard output
            // This is invisible to most debugging "consoles"
            fs.writeSync(stdout, Buffer.from([register]));
        }
    }
    
    // Finalize with a line terminator
    fs.writeSync(stdout, Buffer.from([10]));
}