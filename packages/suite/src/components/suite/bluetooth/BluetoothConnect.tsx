import { useCallback, useEffect, useState } from 'react';

import TrezorConnect from '@trezor/connect';
import { Card, Column, ElevationUp } from '@trezor/components';
import { spacings } from '@trezor/theme';
import { notificationsActions } from '@suite-common/toast-notifications';
import { bluetoothManager } from '@trezor/transport-bluetooth';

import { BluetoothNotEnabled } from './errors/BluetoothNotEnabled';
import { BluetoothDeviceList } from './BluetoothDeviceList';
import { BluetoothVersionNotCompatible } from './errors/BluetoothVersionNotCompatible';
import { BluetoothTips } from './BluetoothTips';
import { BluetoothScanHeader } from './BluetoothScanHeader';
import { BluetoothScanFooter } from './BluetoothScanFooter';
import { useDispatch, useSelector } from '../../../hooks/suite';
import { BluetoothSelectedDevice } from './BluetoothSelectedDevice';
import {
    bluetoothAdapterEventAction,
    bluetoothConnectDeviceEventAction,
    bluetoothDeviceListUpdate,
    bluetoothScanStatusAction,
    bluetoothSelectDeviceAction,
} from '../../../actions/bluetooth/bluetoothActions';
import {
    selectBluetoothDeviceList,
    selectBluetoothEnabled,
    selectBluetoothScanStatus,
    selectBluetoothSelectedDevice,
} from '../../../reducers/bluetooth/bluetoothSelectors';
import { BluetoothPairingPin } from './BluetoothPairingPin';

const SCAN_TIMEOUT = 30_000;

type BluetoothConnectProps = {
    onClose: () => void;
    uiMode: 'spatial' | 'card';
};

type TimerId = ReturnType<typeof setTimeout>; // Todo: TimerId import type after rebase

export const BluetoothConnect = ({ onClose, uiMode }: BluetoothConnectProps) => {
    const dispatch = useDispatch();
    const [scannerTimerId, setScannerTimerId] = useState<TimerId | null>(null);

    const isBluetoothEnabled = useSelector(selectBluetoothEnabled);
    const scanStatus = useSelector(selectBluetoothScanStatus);
    const selectedDevice = useSelector(selectBluetoothSelectedDevice);
    const deviceList = useSelector(selectBluetoothDeviceList);

    // Todo: move this to some Singleton component to synchronize the bluetoothManager with Redux State
    // Todo: or move to action in the same manner as TrezorConnect.init() is initialized
    // See: package/suite/services
    useEffect(() => {
        bluetoothManager.on('adapter-event', isPowered => {
            console.warn('adapter-event', isPowered);
            dispatch(bluetoothAdapterEventAction({ isPowered }));
        });

        bluetoothManager.on('device-list-update', devices => {
            console.warn('device-list-update', devices);
            dispatch(bluetoothDeviceListUpdate({ devices }));
        });

        bluetoothManager.on('device-connection-status', connectionStatus => {
            console.warn('device-connection-status', connectionStatus);
            dispatch(bluetoothConnectDeviceEventAction({ connectionStatus }));
        });

        // Todo: this shall not be on top-level, this shall be called onClick on the connect button
        bluetoothManager.startScan();

        return () => {
            bluetoothManager.removeAllListeners('adapter-event');
            bluetoothManager.removeAllListeners('device-list-update');
            bluetoothManager.removeAllListeners('device-connection-status');

            // Todo: move this to action and run on close or something
            bluetoothManager.stopScan();
        };
    }, [dispatch]);

    const clearScamTimer = useCallback(() => {
        if (scannerTimerId !== null) {
            clearTimeout(scannerTimerId);
        }
    }, [scannerTimerId]);

    useEffect(() => {
        // Intentionally no `clearScamTimer`, this is first run and if we use this we would create infinite re-render
        const timerId = setTimeout(() => {
            dispatch(bluetoothScanStatusAction({ status: 'done' }));
        }, SCAN_TIMEOUT);

        setScannerTimerId(timerId);
    }, [dispatch]);

    const onReScanClick = () => {
        dispatch(bluetoothSelectDeviceAction({ uuid: undefined }));
        dispatch(bluetoothScanStatusAction({ status: 'running' }));

        clearScamTimer();
        const timerId = setTimeout(() => {
            dispatch(bluetoothScanStatusAction({ status: 'done' }));
        }, SCAN_TIMEOUT);
        setScannerTimerId(timerId);
    };

    const onSelect = async (uuid: string) => {
        dispatch(bluetoothSelectDeviceAction({ uuid }));

        // Todo move this to action and call this in thunk
        const result = await bluetoothManager.connectDevice(uuid);

        if (!result.success) {
            dispatch(
                bluetoothConnectDeviceEventAction({
                    connectionStatus: { type: 'error', uuid, error: result.error },
                }),
            );
            dispatch(
                notificationsActions.addToast({
                    type: 'error',
                    error: result.error,
                }),
            );
        } else {
            // Todo: What to do with error in this flow? UI-Wise

            dispatch(
                bluetoothConnectDeviceEventAction({
                    connectionStatus: { type: 'connected', uuid },
                }),
            );

            // WAIT for connect event, TODO: figure out better way
            const closePopupAfterConnection = () => {
                TrezorConnect.off('device-connect', closePopupAfterConnection);
                TrezorConnect.off('device-connect_unacquired', closePopupAfterConnection);
                // setSelectedDeviceStatus({ type: 'error', uuid }); // Todo: what here?
            };
            TrezorConnect.on('device-connect', closePopupAfterConnection);
            TrezorConnect.on('device-connect_unacquired', closePopupAfterConnection);
        }
    };

    if (!isBluetoothEnabled) {
        return <BluetoothNotEnabled onCancel={onClose} />;
    }

    // Todo: incompatible version
    if (false) {
        return <BluetoothVersionNotCompatible onCancel={onClose} />;
    }

    console.log('selectedDevice', selectedDevice);

    // This is fake, we scan for devices all the time
    const isScanning = scanStatus !== 'done';
    const scanFailed = deviceList.length === 0 && scanStatus === 'done';

    const handlePairingCancel = () => {
        dispatch(bluetoothSelectDeviceAction({ uuid: undefined }));
        onReScanClick();
    };

    if (selectedDevice !== undefined && selectedDevice.status.type !== 'pairing') {
        return <BluetoothSelectedDevice device={selectedDevice} onReScanClick={onReScanClick} />;
    }

    if (
        selectedDevice !== undefined &&
        selectedDevice.status.type === 'pairing' &&
        (selectedDevice.status.pin?.length ?? 0) > 0
    ) {
        return (
            <BluetoothPairingPin
                device={selectedDevice.device}
                pairingPin={selectedDevice.status.pin}
                onCancel={handlePairingCancel}
            />
        );
    }

    const content = scanFailed ? (
        <BluetoothTips onReScanClick={onReScanClick} header="Check tips & try again" />
    ) : (
        <BluetoothDeviceList
            isDisabled={selectedDevice !== undefined}
            onSelect={onSelect}
            deviceList={deviceList}
            isScanning={isScanning}
        />
    );

    return (
        <Column gap={spacings.sm} flex="1">
            <Card paddingType="none">
                <Column
                    gap={spacings.md}
                    margin={{ vertical: spacings.xxs, horizontal: spacings.xxs }}
                    alignItems="stretch"
                >
                    <BluetoothScanHeader
                        isScanning={isScanning}
                        onClose={onClose}
                        numberOfDevices={deviceList.length}
                    />

                    {/* Here we need to do +1 in elevation because of custom design on the welcome screen */}
                    {uiMode === 'spatial' ? <ElevationUp>{content}</ElevationUp> : content}

                    {uiMode === 'card' && (
                        <BluetoothScanFooter
                            onReScanClick={onReScanClick}
                            numberOfDevices={deviceList.length}
                            scanStatus={scanStatus}
                        />
                    )}
                </Column>
            </Card>

            {uiMode === 'spatial' && (
                // Here we need to do +2 in elevation because of custom design on the welcome screen
                <ElevationUp>
                    <ElevationUp>
                        <BluetoothScanFooter
                            onReScanClick={onReScanClick}
                            numberOfDevices={deviceList.length}
                            scanStatus={scanStatus}
                        />
                    </ElevationUp>
                </ElevationUp>
            )}
        </Column>
    );
};
