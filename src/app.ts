import type * as api from "./api";

import express from "express";
import {Express} from "express";
import httpProxy from "http-proxy";
import Server from "http-proxy";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import {validator} from "./validator";

function isTargetDomain(host: string, domains: api.ServerDomain[]): boolean {
    console.log(host, domains);

    for (const domain of domains) {
        if (domain.regex) {
            const regex: RegExp = new RegExp(domain.domain, domain.regexFlags);
            if (regex.test(host)) {
                return true;
            }
        } else if (domain.domain == host) {
            return true;
        }
    }
    return false;
}

const configFile: string | undefined = process.env["KSM_CONFIG"];
const serverlistFile: string | undefined = process.env["KSM_SERVERLIST"];
const httpPort: number = parseInt(process.env["HTTP_PORT"] || "0")
const httpsPort: number = parseInt(process.env["HTTPS_PORT"] || "0")

if (!configFile || !serverlistFile) {
    console.log("Missing env variables");
    process.exit(1);
}

const config: api.ExtConfig = JSON.parse(fs.readFileSync(configFile, "utf8"));
const serverlist: api.Serverlist = JSON.parse(fs.readFileSync(serverlistFile, "utf8"));
const serverConfigs: api.ExtServerConfig[] = serverlist.map(v => {
    if (!fs.existsSync(v.path) || !fs.statSync(v.path).isFile()) {
        return null;
    }

    const config: api.ExtServerConfig = JSON.parse(fs.readFileSync(v.path, "utf8"));
    try {
        validator.validateExtServerConfig(config);
    } catch {
        return null;
    }

    if (!config.proxy.enable) {
        return null;
    }
    return config;
}).filter(c => c != null) as api.ExtServerConfig[];

if (!config.proxy.enable) {
    console.log("Proxy is not enabled");
    process.exit(1);
}

let httpServer: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | undefined;
let httpsServer: https.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | undefined;

const app: Express = express();

if (httpPort != 0) {
    httpServer = http.createServer(app);
}
if (httpsPort != 0 && config.proxy.security.cert.public != "" && config.proxy.security.cert.private != "") {
    if (
        fs.existsSync(config.proxy.security.cert.public) && fs.statSync(config.proxy.security.cert.public).isFile() &&
        fs.existsSync(config.proxy.security.cert.private) && fs.statSync(config.proxy.security.cert.private).isFile()
    ) {
        const key: Buffer = fs.readFileSync(config.proxy.security.cert.private);
        const cert: Buffer = fs.readFileSync(config.proxy.security.cert.public);
        httpsServer = https.createServer({key, cert}, app);
    } else {
        console.log("Public & Private key don't exists or they are not a file")
    }
}

if (!httpServer && !httpsServer) {
    console.log("No server active or able to be active");
    process.exit(1);
}

const proxy: Server<http.IncomingMessage, http.ServerResponse> = httpProxy.createProxyServer();


app.all("*", (req, res) => {
    const domain: string = req.headers.host!;
    const ip: api.IPString = req.ip!.replace(/::.*:/gi, "") as api.IPString;

    console.log(`REQ: ${ip} -> ${domain}`);

    for (const serverConfig of serverConfigs) {
        if (!isTargetDomain(domain, serverConfig.proxy.domains)) {
            continue;
        }

        if (serverConfig.proxy.security["block-by-default"] && !serverConfig.proxy.security["ip-whitelist"].includes(ip)) {
            continue;
        }
        if (serverConfig.proxy.security["ip-blacklist"].includes(ip)) {
            continue;
        }
        try {
            if (config.proxy.security["https-redirect"]) {
                proxy.web(req, res, {target: `http://localhost:${serverConfig.ports.https}`});
                console.log(`     Redirect -> http://localhost:${serverConfig.ports.https}`);
                return;
            } else {
                console.log(`     Redirect -> ${req.protocol}://localhost:${req.protocol.startsWith("https") ? serverConfig.ports.https : serverConfig.ports.http}`);
                proxy.web(req, res, {target: `${req.protocol}://localhost:${req.protocol.startsWith("https") ? serverConfig.ports.https : serverConfig.ports.http}`});
                return;
            }
        } catch {
            return;
        }
    }

    console.log("     Redirect -> 502");

    res.sendStatus(502);
});

if (!!httpServer) {
    httpServer.listen(httpPort);
}
if (!!httpsServer) {
    httpsServer.listen(httpsPort);
}

