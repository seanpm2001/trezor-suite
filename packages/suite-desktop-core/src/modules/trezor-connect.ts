import { ipcMain } from 'electron';

import TrezorConnect, { DEVICE_EVENT } from '@trezor/connect';
import { createIpcProxyHandler, IpcProxyHandlerOptions } from '@trezor/ipc-proxy';

import { Dependencies, mainThreadEmitter, ModuleInitBackground, ModuleInit } from './index';

export const SERVICE_NAME = '@trezor/connect';

export const initBackground: ModuleInitBackground = ({ store }: Pick<Dependencies, 'store'>) => {
    const { logger } = global;
    logger.info(SERVICE_NAME, `Starting service`);

    const setProxy = (ifRunning = false) => {
        console.log('setProxy');
        console.log('setProxy');
        console.log('setProxy');
        console.log('setProxy');
        console.log('setProxy');
        console.log('setProxy');
        console.log('setProxy');
        console.log('setProxy');
        console.log('setProxy');
        const torSettings = store.getTorSettings();
        console.log('torSettings', torSettings);
        if (ifRunning && !torSettings.running) return Promise.resolve();
        const payload = torSettings.running
            ? { proxy: `socks://${torSettings.host}:${torSettings.port}` }
            : { proxy: '' };
        console.log('payload', payload);
        logger.info(
            SERVICE_NAME,
            `${torSettings.running ? 'Enable' : 'Disable'} proxy ${payload.proxy}`,
        );

        return TrezorConnect.setProxy(payload);
    };

    const ipcProxyOptions: IpcProxyHandlerOptions<typeof TrezorConnect> = {
        onCreateInstance: () => ({
            onRequest: async (method, params) => {
                console.log('onRequest in trezor connect module');
                logger.debug(SERVICE_NAME, `call ${method}`);
                if (method === 'init') {
                    const response = await TrezorConnect[method](...params);
                    await setProxy(true);

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
