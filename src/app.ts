import type * as api from "./api";
import {validator} from "./validator";

import httpProxy from "http-proxy";
import type Server from "http-proxy";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";

const KSM_CONFIG: string | undefined = process.env["KSM_CONFIG"];
const KSM_SERVERLIST: string | undefined = process.env["KSM_SERVERLIST"];
const HTTP_PORT: number = parseInt(process.env["HTTP_PORT"]!);
const HTTPS_PORT: number = parseInt(process.env["HTTPS_PORT"]!);

if (!KSM_CONFIG || !KSM_SERVERLIST || isNaN(HTTP_PORT) || isNaN(HTTPS_PORT)) {
    console.log("Missing env variables");
    process.exit(1);
}

const config: api.ExtConfig = JSON.parse(fs.readFileSync(KSM_CONFIG, "utf8"));
const serverlist: api.Serverlist = JSON.parse(fs.readFileSync(KSM_SERVERLIST, "utf8"));

if (!config.proxy.enable) {
    console.log("Proxy is not enabled");
    process.exit(1);
}

const proxy: Server<http.IncomingMessage, http.ServerResponse> = httpProxy.createProxyServer({});

const ksmConfigs: api.ExtServerConfig[] = serverlist.map(entry => {
    try {
        const config: api.ExtServerConfig = JSON.parse(fs.readFileSync(entry.path, "utf8"));
        validator.validateExtServerConfig(config);

        if (!config.proxy.enable) {
            return null;
        }

        return config;
    } catch {
        return null;
    }
}).filter(c => c != null) as api.ExtServerConfig[];

function isDomainAllowed(hostname: string, domains: api.ServerDomain[]): boolean {
    return domains.some(d => {
        const {domain, regex, regexFlags} = d;
        if (regex) {
            const re: RegExp = new RegExp(domain, regexFlags);
            const match: boolean = re.test(hostname);
            console.log(`Domain '${hostname}' matched regex '${domain}': ${match}`);
            return match;
        }
        const match: boolean = domain == hostname;
        console.log(`Domain '${hostname}' matched '${domain}': ${match}`);
        return match;
    });
}

function findKSMForDomain(hostname: string): api.ExtServerConfig | null {
    console.log(`Finding KSM configuration for hostname: ${hostname}`);
    for (let config of ksmConfigs) {
        if (isDomainAllowed(hostname, config.proxy.domains)) {
            console.log(`Matched KSM configuration for hostname '${hostname}'.`);
            return config;
        }
    }

    console.log(`No matching KSM configuration found for hostname '${hostname}'.`);
    return null;
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse, isHttps: boolean): void {
    const hostname: string | undefined = req.headers.host;
    const ipAddress: api.IPString | undefined = req.socket.remoteAddress as api.IPString | undefined;
    if (!hostname) {
        console.log("400 Bad Request - Corrupted Request.");
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.end("400 Bad Request - Corrupted Request.");
        return;
    }
    if (!ipAddress) {
        console.log("400 Bad Request - Corrupted Request.");
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.end("400 Bad Request - Corrupted Request.");
        return;
    }

    const matchingKSMConfig: api.ExtServerConfig | null = findKSMForDomain(hostname);
    if (!matchingKSMConfig) {
        console.log(`404 Not Found - No matching KSM configuration found for hostname: ${hostname}`);
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404 Not Found - No matching KSM configuration found.');
        return;
    }

    if (matchingKSMConfig.proxy.security["block-by-default"] && !matchingKSMConfig.proxy.security["ip-whitelist"].includes(ipAddress) ||
        matchingKSMConfig.proxy.security["ip-blacklist"].includes(ipAddress)) {
        console.log(`401 Not Found - IP Address is blocked by the server`);
        res.writeHead(401, {'Content-Type': 'text/plain'});
        res.end('401 Not Found - IP Address is blocked by the server');
        return;
    }

    const targetPort: number = isHttps ? matchingKSMConfig.ports.https : matchingKSMConfig.ports.http;
    if (targetPort == 0) {
        console.error('502 Bad Gateway - The target server is not activated.'); // Log the error
        res.writeHead(502, {'Content-Type': 'text/plain'});
        res.end('502 Bad Gateway - The target server is not reachable.');
    }
    const target: string = `${isHttps ? "https" : "http"}://localhost:${targetPort}`;

    console.log(`Proxying request to: ${target}`);

    proxy.web(req, res, {target}, error => {
        console.error('502 Proxy error:', error); // Log the error
        res.writeHead(502, {'Content-Type': 'text/plain'});
        res.end('502 Bad Gateway - The target server is not reachable.');
    });
}

let httpServer: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | undefined;

if (config.proxy.enable && HTTP_PORT != 0) {
    httpServer = http.createServer((req: http.IncomingMessage, res: http.ServerResponse): void => {
        console.log(`Received HTTP request for: ${req.url}`);
        handleRequest(req, res, false);
    });
}

let httpsServer: https.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | undefined;

if (config.proxy.enable && HTTPS_PORT != 0) {
    if (fs.existsSync(config.proxy.security.cert.public) && fs.statSync(config.proxy.security.cert.public).isFile() &&
        fs.existsSync(config.proxy.security.cert.private) && fs.statSync(config.proxy.security.cert.private).isFile()) {
        const pub: Buffer = fs.readFileSync(config.proxy.security.cert.public);
        const prv: Buffer = fs.readFileSync(config.proxy.security.cert.private);
        httpsServer = https.createServer({
            key: prv,
            cert: pub
        }, (req: http.IncomingMessage, res: http.ServerResponse): void => {
            console.log(`Received HTTPS request for: ${req.url}`);
            handleRequest(req, res, true);
        });
    }
}

if (!!httpServer) {
    httpServer.listen(HTTP_PORT, () => {
        console.log(`Proxy server is running on port ${HTTP_PORT} (HTTP)`);
    });
}

if (!!httpsServer) {
    httpsServer.listen(HTTPS_PORT, () => {
        console.log(`Proxy server is running on port ${HTTPS_PORT} (HTTPS)`);
    });
}