import { WebSocketServer } from 'ws';

import TrezorConnect, { IFRAME, POPUP } from '@trezor/connect';

import { createHttpReceiver } from './http-receiver';
import { Dependencies } from '../modules';

const LOG_PREFIX = 'connect-ws';

export const exposeConnectWs = ({
    mainThreadEmitter,
    httpReceiver,
}: {
    mainThreadEmitter: Dependencies['mainThreadEmitter'];
    httpReceiver: ReturnType<typeof createHttpReceiver>;
}) => {
    const { logger } = global;

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

    httpReceiver.server.on('upgrade', (request, socket, head) => {
        if (!request?.url) return;
        const { pathname } = new URL(request.url, 'http://localhost');
        if (pathname === '/connect-ws') {
            wss.handleUpgrade(request, socket, head, ws => {
                wss.emit('connection', ws, request);
            });
        }
    });
};
