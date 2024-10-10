#!/usr/bin/env node
const os = require("os");
const path = require("path");
const child_process = require("child_process");
const fs = require("fs");

if (os.type() !== "Linux") {
    console.log("KMS is not running on a linux system so not all features can be provided");
    process.exit(0);
}

if (process.geteuid() !== 0) {
    console.log("KSM must be install with root privileges");
    process.exit(1);
}

const proc = child_process.spawnSync("ksm", ["install"], {
    shell: true,
    cwd: path.join(__dirname, "..")
});

if (proc.status !== 0) {
    console.log(`Failed to add proxy to ksm: ${proc.stdout.toString("utf8")}`);
    process.exit(proc.status);
}

const configPath = "/etc/ksm/config.json";
try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    config["proxy"] = {
        enable: true,
        security: {
            cert: {
                public: "",
                private: ""
            }
        }
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
} catch (e) {
    console.log("Failed to execute post-install script:\n" + e);
    process.exit(1);
}

process.exit(0);
