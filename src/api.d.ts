// From: https://github.com/bytelab-studio/ksm/blob/master/src/api.ts
export type IPString = `${number}.${number}.${number}`;
export type ENVValue = string | number | boolean;

export interface Config {
    env: Record<string, ENVValue>;
}

export interface ServerDomain {
    domain: string;
    regex: boolean;
    regexFlags: string;
}


export interface ServerConfig {
    cwd: string;
    ports: {
        http: number;
        https: number;
    }
    env: Record<string, ENVValue>;
    command: string[];
}

export interface ServerEntry {
    pid: number | -1;
    path: string;
}

export type Serverlist = ServerEntry[];


// ---------------------------------------------------------------------------------------------------------------------
// Own addition

export interface ExtServerConfig extends ServerConfig {
    proxy: {
        enable: boolean;
        domains: ServerDomain[];
        security: {
            "ip-blacklist": IPString[];
            "ip-whitelist": IPString[];
            "block-by-default": boolean;
        }
    }
}

export interface ProxyConfig {
    enable: boolean;
    security: {
        cert: {
            public: string;
            private: string;
        }
        "https-redirect": boolean;
        "ip-blacklist": IPString[];
    }
}

export interface ExtConfig extends Config {
    proxy: ProxyConfig;
}
