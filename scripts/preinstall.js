#!/usr/bin/env node
const os = require("os");
const child_process = require("child_process");

if (os.type() !== "Linux") {
    console.log("KMS is not running on a linux system so not all features can be provided");
    process.exit(0);
}

if (process.geteuid() !== 0) {
    console.log("KSM must be install with root privileges");
    process.exit(1);
}

const proc = child_process.spawnSync("which", ["ksm"], {
    shell: true
});

if (proc.status !== 0) {
    console.log("ksm-proxy can only be installed if ksm is installed");
}

process.exit(proc.status);