/* eslint-disable no-console */

import fetch from 'cross-fetch';

import { WebsocketClient as WebsocketClientBase } from '@trezor/websocket';

import { Firmwares } from './types';

// Making the timeout high because the controller in trezor-user-env
// must synchronously run actions on emulator and they may take a long time
// (for example in case of Shamir backup)
const DEFAULT_TIMEOUT = 5 * 60 * 1000;
const DEFAULT_PING_TIMEOUT = 50 * 1000;

// breaking change in node 17, ip6 is preferred by default
// localhost is not resolved correctly on certain machines
const USER_ENV_URL = {
    WEBSOCKET: `ws://127.0.0.1:9001/`,
    DASHBOARD: `http://127.0.0.1:9002`,
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type WebsocketClientEvents = {
    firmwares: Firmwares;
    disconnected: undefined;
};

export class WebsocketClient extends WebsocketClientBase<WebsocketClientEvents> {
    protected createWebsocket() {
        // url validation
        let { url } = this.options;
        if (typeof url !== 'string') {
            throw new Error('websocket_no_url');
        }

        if (url.startsWith('https')) {
            url = url.replace('https', 'wss');
        }
        if (url.startsWith('http')) {
            url = url.replace('http', 'ws');
        }

        return this.initWebsocket(url, {});
    }

    protected ping() {
        // TODO
        return Promise.resolve();
    }

    constructor(options: any = {}) {
        super({
            ...options,
            url: options.url || USER_ENV_URL.WEBSOCKET,
            timeout: options.timeout || DEFAULT_TIMEOUT,
            pingTimeout: options.pingTimeout || DEFAULT_PING_TIMEOUT,
        });
    }

    // todo: typesafe interface
    send(params: any) {
        // probably after update to node 18 it started to disconnect after certain
        // period of inactivity.

        // todo: proper return type
        return this.sendMessage(params);
    }

    connect(): Promise<void> {
        return new Promise<void>(resolve => {
            super.connect().then(() => {
                this.once('firmwares', () => resolve());
            });
        });
    }

    protected onMessage(message: string | Buffer) {
        // Websocket.Data
        try {
            const resp = JSON.parse(message.toString());
            const { id, success } = resp;

            if (resp.type === 'client') {
                const { firmwares } = resp;

                this.emit('firmwares', firmwares);
            }

            if (!success) {
                this.messages.reject(
                    Number(id),
                    new Error(`websocket_error_message: ${resp.error.message || resp.error}`),
                );
            } else {
                this.messages.resolve(Number(id), resp);
            }
        } catch {
            // empty
        }
    }

    // public async connect() {
    //     if (this.isConnected()) return Promise.resolve();

    //     // workaround for karma... proper fix: set allow origin headers in trezor-user-env server. but we are going
    //     // to get rid of karma anyway, so this does not matter
    //     if (typeof window === 'undefined') {
    //         await this.waitForTrezorUserEnv();
    //     }

    //     return new Promise(resolve => {
    //         // url validation
    //         let { url } = this.options;
    //         if (typeof url !== 'string') {
    //             throw new Error('websocket_no_url');
    //         }

    //         if (url.startsWith('https')) {
    //             url = url.replace('https', 'wss');
    //         }
    //         if (url.startsWith('http')) {
    //             url = url.replace('http', 'ws');
    //         }

    //         // set connection timeout before WebSocket initialization
    //         // it will be be cancelled by this.init or this.dispose after the error
    //         this.setConnectionTimeout();

    //         // initialize connection
    //         const ws = new WebSocket(url);

    //         ws.once('error', error => {
    //             console.error('websocket error', error);
    //             this.dispose();
    //         });

    //         this.on('firmwares', () => {
    //             resolve(this);
    //         });

    //         this.ws = ws;

    //         ws.on('open', () => {
    //             this.init();
    //         });
    //     });
    // }

    async waitForTrezorUserEnv() {
        // unfortunately, it can take incredibly long for trezor-user-env to start, we should
        // do something about it
        const limit = 300;
        let error = '';

        console.log('waiting for trezor-user-env');

        for (let i = 0; i < limit; i++) {
            if (i === limit - 1) {
                console.log(`cant connect to trezor-user-env: ${error}\n`);
            }
            await delay(1000);

            try {
                const res = await fetch(USER_ENV_URL.DASHBOARD);
                if (res.status === 200) {
                    console.log('trezor-user-env is online');

                    return;
                }
            } catch (err) {
                error = err.message;
                // using process.stdout.write instead of console.log since the latter always prints also newline
                // but in karma, this code runs in browser and process is not available.
                if (typeof process !== 'undefined') {
                    process.stdout.write('.');
                } else {
                    console.log('.');
                }
            }
        }

        throw error;
    }
}
