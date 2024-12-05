import WebSocket from 'ws';

import { WebsocketClient } from '../src/client';

class Cli extends WebsocketClient<{ 'foo-event': 'bar-event' }> {
    createWebsocket() {
        return new WebSocket('aaa');
    }
    ping() {
        return Promise.resolve();
    }

    sendMessage(_message: Record<string, any>) {
        return Promise.resolve({ success: true });
    }
}

describe('WebsocketClient', () => {
    it.skip('logger returns true', async () => {
        const cli = new Cli({ url: 'aaa' });
        await cli.connect();

        cli.on('foo-event', event => {
            if (event === 'bar-event') {
                //
            }
        });

        const resp = await cli.sendMessage({ foo: 'bar' });
        expect(resp).toEqual({ success: true });
    });
});
