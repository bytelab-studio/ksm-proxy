import type * as api from "./api";

export namespace validator {
    export function validateExtServerConfig(serverConfig: api.ExtServerConfig): void {
        if (typeof serverConfig.proxy.enable != "boolean") {
            throw new Error("Invalid file format (proxy.enable)");
        }
        if (typeof serverConfig.proxy.security["block-by-default"] != "boolean") {
            throw new Error("Invalid file format (proxy.security.block-by-default)");
        }

        for (let i: number = 0; i < serverConfig.proxy.domains.length; i++) {
            if (typeof serverConfig.proxy.domains[i].regex != "boolean") {
                throw new Error(`Invalid file format (proxy.domains.${i}.regex)`);
            }
            if (typeof serverConfig.proxy.domains[i].regexFlags != "string") {
                throw new Error(`Invalid file format (proxy.domains.${i}.regexFlags)`);
            }
            if (typeof serverConfig.proxy.domains[i].domain != "string") {
                throw new Error(`Invalid file format (proxy.domains.${i}.domain)`);
            }
        }
        for (let i: number = 0; i < serverConfig.proxy.security["ip-blacklist"].length; i++) {
            if (typeof serverConfig.proxy.security["ip-blacklist"][i] != "string") {
                throw new Error(`Invalid file format (proxy.security.${i}.ip-blacklist)`);
            }
        }
        for (let i: number = 0; i < serverConfig.proxy.security["ip-whitelist"].length; i++) {
            if (typeof serverConfig.proxy.security["ip-whitelist"][i] != "string") {
                throw new Error(`Invalid file format (proxy.security.${i}.ip-whitelist)`);
            }
        }
    }
}