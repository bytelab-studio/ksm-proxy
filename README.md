# KSM Proxy

A proxy extension for the [KSM](https://github.com/bytelab-studio/ksm) project.

## Installation

```shell
npm install -g ksm-proxy
```

> The installation requires root privileges. Also, KSM must be pre-installed before the extension can be added.

## Configuration

```typescript
// Extension configuration
export interface ServerDomain {
    domain: string;
    regex: boolean;
    regexFlags: string;
}

interface ProxyConfig {
    enable: boolean;
    domains: ServerDomain[];
    security: {
        "ip-blacklist": string[];
        "ip-whitelist": string[];
        "block-by-default": boolean;
    }
}

// Base configuration
interface ServerConfig {
    proxy: ProxyConfig;
    cwd: string;
    ports: {
        http: number;
        https: number;
    }
    env: Record<string, string | boolean | number>;
    command: string[];
}
```

When installed the server config can be further configured with proxy information in the `proxy` field.

### Sample configuration

An extended example configuration for an express.js app

```json
{
    "proxy": {
        "enable": true,
        "domains": [
            {
                "domain": "foo.example.com",
                "regex": false,
                "regexFlags": ""
            },
            {
                "domain": "bar.*\\.example\\.com",
                "regex": true,
                "regexFlags": "i"
            }
        ],
        "security": {
            "ip-blacklist": ["8.8.8.8"],
            "ip-whitelist": [],
            "block-by-default": false
        }
    },
    "cwd": ".",
    "ports": {
        "http": 2000,
        "https": 2001
    },
    "env": {
        "debug": false
    },
    "command": [
        "node",
        "./app/main.js"
    ]
}
```

When added the server can be called by the domains via the proxy server.

### Template configuration

```json
{
    "proxy": {
        "enable": true,
        "domains": [],
        "security": {
            "ip-blacklist": [],
            "ip-whitelist": [],
            "block-by-default": false
        }
    },
    "cwd": ".",
    "ports": {
        "http": 0,
        "https": 0
    },
    "env": {},
    "command": []
}
```

### Base configuration

KSM Proxy extends the base configuration located at `/etc/ksm/config.json` with the `proxy` property.

```json
{
    "proxy": {
        "enable": false,
        "security": {
            "cert": {
                "public": "",
                "private": ""
            },
            "https-redirect": false,
            "ip-blacklist": []
        }
    },
    "env": {
        "ksm-config": "/etc/ksm/config.json",
        "ksm-serverlist": "/etc/ksm/serverlist"
    }
}
```

### Advance configuration

KSM Proxy is an advance KSM server, so ports and other things can be configured in the `ksm.json` file, located at
the `ksm-proxy` npm package installation location.

## Contribution

Contributions are welcome! If you'd like to help improve KSM, feel free to submit a pull request or open an issue.
Whether it's bug fixes, new features, or documentation improvements, all contributions are appreciated.