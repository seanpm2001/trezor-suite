import { parseConnectSettings } from '../../data/connectSettings';
import { DataManager } from '../../data/DataManager';
import * as downloadReleasesMetadata from '../../data/downloadReleasesMetadata';
import { DeviceList } from '../DeviceList';

const { createTestTransport } = global.JestMocks;

const waitForNthEventOfType = (
    emitter: { on: (...args: any[]) => any },
    type: string,
    number: number,
) => {
    // wait for all device-connect events
    return new Promise<void>(resolve => {
        let i = 0;
        emitter.on(type, () => {
            if (++i === number) {
                resolve();
            }
        });
    });
};

const DEVICE_CONNECTION_SEQUENCE = ['device-changed', 'device-changed', 'device-connect'];

describe('DeviceList', () => {
    beforeAll(async () => {
        // todo: I don't get it. If we pass empty messages: {} (see getDeviceListParams), tests behave differently.
        await DataManager.load({
            ...parseConnectSettings({}),
        });

        // Todo: This is a hack, it should not be here at all. Transport shall return valid device (with valid features)
        //       so this `downloadReleasesMetadata` is actually never called.
        jest.spyOn(downloadReleasesMetadata, 'downloadReleasesMetadata').mockImplementation(() =>
            Promise.resolve([]),
        );
    });

    let list: DeviceList;
    let eventsSpy: jest.Mock;

    beforeEach(() => {
        list = new DeviceList({
            ...parseConnectSettings({}),
            messages: DataManager.getProtobufMessages(),
        });
        eventsSpy = jest.fn();
        (
            [
                'transport-start',
                'transport-error',
                'device-connect',
                'device-connect_unacquired',
                'device-changed',
                'device-disconnect',
            ] as const
        ).forEach(event => {
            list.on(event, data => eventsSpy(event, data));
        });
    });

    afterEach(() => {
        list.dispose();
    });

    it('.init() throws error on unknown transport (string)', async () => {
        await expect(() =>
            list.init({
                // @ts-expect-error
                transports: ['FooBarTransport'],
            }),
        ).rejects.toThrow('unexpected type: FooBarTransport');
    });

    it('.init() throws error on unknown transport (class)', async () => {
        await expect(() =>
            list.init({
                // @ts-expect-error
                transports: [{}, () => {}, [], String, 1, 'meow-non-existent'],
            }),
        ).rejects.toThrow('DeviceList.init: transports[] of unexpected type');
    });

    it('.init() accepts transports in form of transport class', async () => {
        const transport = createTestTransport();
        const classConstructor = transport.constructor as unknown as typeof transport;
        await expect(list.init({ transports: [classConstructor] })).resolves.not.toThrow();
    });

    it('.init() throws async error from transport.init()', async () => {
        const transport = createTestTransport();
        jest.spyOn(transport, 'init').mockImplementation(() =>
            Promise.resolve({
                success: false,
                error: 'unexpected error',
                message: '',
            } as const),
        );

        list.init({ transports: [transport], pendingTransportEvent: true });
        // transport-error is not emitted yet because list.init is not awaited
        expect(eventsSpy).toHaveBeenCalledTimes(0);
        await list.pendingConnection();
        expect(eventsSpy).toHaveBeenCalledTimes(1);
    });

    it('.init() throws async error from transport.enumerate()', async () => {
        const transport = createTestTransport();
        jest.spyOn(transport, 'enumerate').mockImplementation(() =>
            Promise.resolve({
                success: false,
                error: 'unexpected error',
                message: '',
            } as const),
        );

        list.init({ transports: [transport], pendingTransportEvent: true });
        // transport-error is not emitted yet because list.init is not awaited
        expect(eventsSpy).toHaveBeenCalledTimes(0);
        await list.pendingConnection();
        expect(eventsSpy).toHaveBeenCalledTimes(1);
        expect(eventsSpy.mock.calls[0][0]).toEqual('transport-error');
    });

    it('.init() with pendingTransportEvent (unacquired device)', async () => {
        const transport = createTestTransport({
            openDevice: () => Promise.resolve({ success: false, error: 'wrong previous session' }),
        });

        list.init({ transports: [transport], pendingTransportEvent: true });
        await list.pendingConnection();

        const events = eventsSpy.mock.calls.map(call => call[0]);
        expect(events).toEqual(['device-connect_unacquired', 'transport-start']);
    });

    it('.init() with pendingTransportEvent (disconnected device)', async () => {
        const transport = createTestTransport({
            openDevice: () => Promise.resolve({ success: false, error: 'device not found' }),
        });

        list.init({ transports: [transport], pendingTransportEvent: true });
        const transportFirstEvent = list.pendingConnection();

        // NOTE: this behavior is wrong, if device creation fails DeviceList shouldn't wait 10 secs.
        jest.useFakeTimers();
        // move 9 sec forward
        await jest.advanceTimersByTimeAsync(9 * 1000);
        // no events yet
        expect(eventsSpy).toHaveBeenCalledTimes(0);
        // move 2 sec forward
        await jest.advanceTimersByTimeAsync(2 * 1000);
        // promise should be resolved by now
        await transportFirstEvent;
        jest.useRealTimers();

        expect(eventsSpy).toHaveBeenCalledTimes(1);
        expect(eventsSpy.mock.calls[0][0]).toEqual('transport-start');
    });

    it('.init() with pendingTransportEvent (unreadable device)', async () => {
        const transport = createTestTransport({
            read: () => {
                return Promise.resolve({
                    success: true,
                    payload: Buffer.from('3f23230002000000060a046d656f77', 'hex'), // proto.Success
                });
            },
        });

        list.init({ transports: [transport], pendingTransportEvent: true });
        await list.pendingConnection();

        const events = eventsSpy.mock.calls.map(call => call[0]);
        expect(events).toEqual(['device-changed', 'device-connect_unacquired', 'transport-start']);
    });

    it('.init() with pendingTransportEvent (multiple acquired devices)', async () => {
        const transport = createTestTransport({
            enumerate: () => {
                return { success: true, payload: [{ path: '1' }, { path: '2' }, { path: '3' }] };
            },
        });

        list.init({ transports: [transport], pendingTransportEvent: true });
        await list.pendingConnection();

        const events = eventsSpy.mock.calls.map(([event, { path }]) => [event, path]);

        // note: acquire - release - connect should be ok.
        // acquire - deviceList._takeAndCreateDevice start (run -> rurInner -> getFeatures -> release) -> deviceList._takeAndCreateDevice end => emit DEVICE.CONNECT
        expect(events).toEqual([
            ...DEVICE_CONNECTION_SEQUENCE.map(e => [e, events[0][1]]), // path 1
            ...DEVICE_CONNECTION_SEQUENCE.map(e => [e, events[3][1]]), // path 2
            ...DEVICE_CONNECTION_SEQUENCE.map(e => [e, events[6][1]]), // path 3
            ['transport-start', undefined],
        ]);
    });

    it('.init() with pendingTransportEvent (device acquired after retry)', async () => {
        let openTries = 0;
        const transport = createTestTransport({
            openDevice: (path: string) => {
                if (openTries < 1) {
                    openTries++;

                    return { success: false, error: 'totally unexpected' };
                }

                return { success: true, payload: [{ path }] };
            },
        });

        // NOTE: this behavior is wrong
        jest.useFakeTimers();
        list.init({ transports: [transport], pendingTransportEvent: true });
        const transportFirstEvent = list.pendingConnection();
        await jest.advanceTimersByTimeAsync(6 * 1000); // TODO: this is wrong
        await transportFirstEvent;
        jest.useRealTimers();

        // expect(eventsSpy).toHaveBeenCalledTimes(5);
        const events = eventsSpy.mock.calls.map(([event]) => event);
        expect(events).toEqual([
            'device-changed',
            'device-changed',
            'device-connect',
            'transport-start',
        ]);
    });

    it('.init() without pendingTransportEvent (device connected after start)', async () => {
        const transport = createTestTransport();

        list.init({ transports: [transport] });
        await list.pendingConnection();
        // transport start emitted almost immediately (after first enumerate)
        expect(eventsSpy).toHaveBeenCalledTimes(1);

        // wait for device-connect event
        await new Promise(resolve => list.on('device-connect', resolve));

        const events = eventsSpy.mock.calls.map(call => call[0]);
        expect(events).toEqual(['transport-start', ...DEVICE_CONNECTION_SEQUENCE]);
    });

    it('multiple devices connected after .init()', async () => {
        let onChangeCallback = (..._args: any[]) => {};
        const transport = createTestTransport({
            enumerate: () => {
                return { success: true, payload: [] };
            },
            on: (eventName: string, callback: typeof onChangeCallback) => {
                if (eventName === 'transport-interface-change') {
                    onChangeCallback = callback;
                }
            },
        });

        list.init({ transports: [transport], pendingTransportEvent: true });
        await list.pendingConnection();

        // emit TRANSPORT.CHANGE 3 times
        onChangeCallback([{ path: '1' }, { path: '2' }]);
        onChangeCallback([{ path: '1' }, { path: '3' }]); // path 2 disconnected, path 3 connected
        onChangeCallback([{ path: '1' }, { path: '3' }, { path: '4' }]); // path 4 connected

        // wait for all device-connect events
        await waitForNthEventOfType(list, 'device-connect', 3);

        const events = eventsSpy.mock.calls.map(([event, { path }]) => [event, path]);

        expect(events).toEqual([
            ['transport-start', undefined],
            ['device-disconnect', events[1][1]],
            ...DEVICE_CONNECTION_SEQUENCE.map(e => [e, events[2][1]]), // path 1
            ...DEVICE_CONNECTION_SEQUENCE.map(e => [e, events[5][1]]), // path 3
            ...DEVICE_CONNECTION_SEQUENCE.map(e => [e, events[8][1]]), // path 4
        ]);
    });
});
