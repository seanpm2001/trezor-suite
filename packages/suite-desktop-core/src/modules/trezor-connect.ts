import { ipcMain } from 'electron';
import { WebSocketServer } from 'ws';

import TrezorConnect, { DEVICE_EVENT, IFRAME, POPUP } from '@trezor/connect';
import { createIpcProxyHandler, IpcProxyHandlerOptions } from '@trezor/ipc-proxy';
import { isDevEnv } from '@suite-common/suite-utils';

import { app } from '../typed-electron';

import { Dependencies, ModuleInit, ModuleInitBackground } from './index';

export const SERVICE_NAME = '@trezor/connect';

const exposeConnectWs = ({
    mainThreadEmitter,
}: {
    mainThreadEmitter: Dependencies['mainThreadEmitter'];
}) => {
    const { logger } = global;

    const wss = new WebSocketServer({
        port: 8090,
    });

    wss.on('listening', () => {
        logger.info(`${SERVICE_NAME}-ws`, 'Listening on ws://localhost:8090');
    });

    wss.on('connection', ws => {
        ws.on('error', err => {
            logger.error(`${SERVICE_NAME}-ws`, err.message);
        });

        ws.on('message', async data => {
            logger.debug(`${SERVICE_NAME}-ws`, data.toString());
            let message;
            try {
                message = JSON.parse(data.toString());
            } catch {
                logger.error(`${SERVICE_NAME}-ws`, 'message is not valid JSON');

                return;
            }

            if (
                typeof message !== 'object' ||
                typeof message.id !== 'number' ||
                typeof message.type !== 'string'
            ) {
                logger.error(`${SERVICE_NAME}-ws`, 'message is missing required fields (id, type)');

                return;
            }

            if (message.type === POPUP.HANDSHAKE) {
                ws.send(JSON.stringify({ id: message.id, type: POPUP.HANDSHAKE, payload: 'ok' }));
            } else if (message.type === IFRAME.CALL) {
                if (!message.payload || !message.payload.method) {
                    logger.error(`${SERVICE_NAME}-ws`, 'invalid message payload');

                    return;
                }

                const { method, ...rest } = message.payload;

                try {
                    // focus renderer window
                    mainThreadEmitter.emit('app/show');
                    // @ts-expect-error
                    const response = await TrezorConnect[method](rest);
                    ws.send(
                        JSON.stringify({
                            ...response,
                            id: message.id,
                        }),
                    );
                } finally {
                    // blur renderer window
                    // mainThreadEmitter.emit('');
                }
            }
        });
    });

    // todo: hmmm am I allowed to use app here directly?
    app.on('before-quit', () => {
        wss.close();
    });
};

export const initBackground: ModuleInitBackground = ({ mainThreadEmitter, store }) => {
    const { logger } = global;
    logger.info(SERVICE_NAME, `Starting service`);

    const setProxy = (ifRunning = false) => {
        const tor = store.getTorSettings();
        if (ifRunning && !tor.running) return Promise.resolve();
        const payload = tor.running ? { proxy: `socks://${tor.host}:${tor.port}` } : { proxy: '' };
        logger.info(SERVICE_NAME, `${tor.running ? 'Enable' : 'Disable'} proxy ${payload.proxy}`);

        return TrezorConnect.setProxy(payload);
    };

    const ipcProxyOptions: IpcProxyHandlerOptions<typeof TrezorConnect> = {
        onCreateInstance: () => ({
            onRequest: async (method, params) => {
                logger.debug(SERVICE_NAME, `call ${method}`);
                if (method === 'init') {
                    const response = await TrezorConnect[method](...params);
                    await setProxy(true);

                    if (app.commandLine.hasSwitch('expose-connect-ws') || isDevEnv) {
                        exposeConnectWs({ mainThreadEmitter });
                    }

                    return response;
                }

                return (TrezorConnect[method] as any)(...params);
            },
            onAddListener: (eventName, listener) => {
                logger.debug(SERVICE_NAME, `Add event listener ${eventName}`);

                return TrezorConnect.on(eventName, listener);
            },
            onRemoveListener: eventName => {
                logger.debug(SERVICE_NAME, `Remove event listener ${eventName}`);

                return TrezorConnect.removeAllListeners(eventName);
            },
        }),
    };

    const unregisterProxy = createIpcProxyHandler(ipcMain, 'TrezorConnect', ipcProxyOptions);

    const onLoad = () => {
        TrezorConnect.on(DEVICE_EVENT, event => {
            mainThreadEmitter.emit('module/trezor-connect/device-event', event);
        });
    };

    const onQuit = () => {
        unregisterProxy();
        TrezorConnect.dispose();
    };

    return { onLoad, onQuit };
};

export const init: ModuleInit = () => {
    const onLoad = () => {
        // reset previous instance, possible left over after renderer refresh (F5)
        TrezorConnect.dispose();
    };

    return { onLoad };
};
