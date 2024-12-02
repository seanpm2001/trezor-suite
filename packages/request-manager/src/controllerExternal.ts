import { EventEmitter } from 'events';

import { checkSocks5Proxy } from '@trezor/node-utils';

import { waitUntil } from './utils';
import { TOR_CONTROLLER_STATUS, TorControllerStatus, TorExternalConnectionOptions } from './types';

const WAITING_TIME = 1_000;
const MAX_TRIES_WAITING = 200;

export class TorControllerExternal extends EventEmitter {
    status: TorControllerStatus = TOR_CONTROLLER_STATUS.Stopped;
    options: TorExternalConnectionOptions;

    constructor(options: TorExternalConnectionOptions) {
        super();
        this.options = options;
    }

    private getIsStopped() {
        return this.status === TOR_CONTROLLER_STATUS.Stopped;
    }

    private async getIsExternalTorRunning() {
        let isSocks5ProxyPort = false;
        try {
            isSocks5ProxyPort = await checkSocks5Proxy(this.options.host, this.options.port);
        } catch {
            // Ignore errors.
        }

        return isSocks5ProxyPort;
    }

    private startBootstrap() {
        this.status = TOR_CONTROLLER_STATUS.Bootstrapping;
    }

    private successfullyBootstrapped() {
        this.status = TOR_CONTROLLER_STATUS.ExternalTorRunning;
    }

    public getTorConfiguration() {
        return '';
    }

    public async waitUntilAlive() {
        this.startBootstrap();
        await waitUntil(
            MAX_TRIES_WAITING,
            WAITING_TIME,
            async () => {
                const isRunning = await this.getIsExternalTorRunning();
                if (isRunning) {
                    this.successfullyBootstrapped();
                }

                return isRunning;
            },
            () => {
                return this.getIsStopped();
            },
        );
    }

    public async getStatus() {
        const isExternalTorRunning = await this.getIsExternalTorRunning();

        return new Promise(resolve => {
            if (isExternalTorRunning) {
                return resolve(TOR_CONTROLLER_STATUS.ExternalTorRunning);
            }

            return resolve(TOR_CONTROLLER_STATUS.Stopped);
        });
    }

    public closeActiveCircuits() {
        // Do nothing. Not possible in External Tor without ControlPort.
    }

    public stop() {
        this.status = TOR_CONTROLLER_STATUS.Stopped;
    }
}
