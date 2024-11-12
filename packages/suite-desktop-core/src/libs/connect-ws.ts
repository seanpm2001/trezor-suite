import { WebSocketServer } from 'ws';
import { ipcMain } from 'electron';

import { IFRAME, POPUP } from '@trezor/connect';
import { createDeferred, Deferred } from '@trezor/utils';

import { createHttpReceiver } from './http-receiver';
import { Dependencies } from '../modules';

const LOG_PREFIX = 'connect-ws';

export const exposeConnectWs = ({
    mainThreadEmitter,
    mainWindowProxy,
    httpReceiver,
}: {
    mainThreadEmitter: Dependencies['mainThreadEmitter'];
    mainWindowProxy: Dependencies['mainWindowProxy'];
    httpReceiver: ReturnType<typeof createHttpReceiver>;
}) => {
    const { logger } = global;
    const messages: Record<number, Deferred<any, number>> = {};
    let appInit: Deferred<void> | undefined;

    const wss = new WebSocketServer({
        noServer: true,
    });

    wss.on('listening', () => {
        logger.info(LOG_PREFIX, 'Websocket server is listening');
    });

    wss.on('connection', ws => {
        ws.on('error', err => {
            logger.error(LOG_PREFIX, err.message);
        });

        ws.on('message', async data => {
            logger.debug(LOG_PREFIX, data.toString());
            let message;
            try {
                message = JSON.parse(data.toString());
            } catch {
                logger.error(LOG_PREFIX, 'message is not valid JSON');

                return;
            }

            if (
                typeof message !== 'object' ||
                typeof message.id !== 'number' ||
                typeof message.type !== 'string'
            ) {
                logger.error(LOG_PREFIX, 'message is missing required fields (id, type)');

                return;
            }

            if (message.type === POPUP.HANDSHAKE) {
                ws.send(JSON.stringify({ id: message.id, type: POPUP.HANDSHAKE, payload: 'ok' }));
            } else if (message.type === IFRAME.CALL) {
                if (!message.payload || !message.payload.method) {
                    logger.error(LOG_PREFIX, 'invalid message payload');

                    return;
                }

                const { method, ...rest } = message.payload;

                messages[message.id] = createDeferred();

                // focus renderer window
                mainThreadEmitter.emit('app/show');

                // check window exists, if not wait for it to be created
                if (!mainWindowProxy.getInstance()) {
                    logger.info(LOG_PREFIX, 'waiting for window to start');
                    appInit = createDeferred(10000);
                    await appInit.promise;
                    appInit = undefined;
                }

                // send call to renderer
                mainWindowProxy.getInstance()?.webContents.send('connect-popup/call', {
                    id: message.id,
                    method,
                    payload: rest,
                });

                // wait for response
                const response = await messages[message.id].promise;

                ws.send(
                    JSON.stringify({
                        ...response,
                        id: message.id,
                    }),
                );
            }
        });
    });

    httpReceiver.server.on('upgrade', (request, socket, head) => {
        if (!request?.url) return;
        const { pathname } = new URL(request.url, 'http://localhost');
        if (pathname === '/connect-ws') {
            wss.handleUpgrade(request, socket, head, ws => {
                wss.emit('connection', ws, request);
            });
        }
    });

    ipcMain.handle('connect-popup/response', (_, response) => {
        logger.info(LOG_PREFIX, 'received response from popup ' + JSON.stringify(response));
        if (!response || typeof response.id !== 'number') {
            logger.error(LOG_PREFIX, 'invalid response from popup');

            return;
        }

        if (!messages[response.id]) {
            logger.error(LOG_PREFIX, 'no deferred message found');

            return;
        }

        messages[response.id].resolve(response);
    });
    ipcMain.handle('connect-popup/ready', () => {
        appInit?.resolve();
    });
};
