import { createReducer } from '@reduxjs/toolkit';

import { BluetoothDevice, DeviceConnectionStatus } from '@trezor/transport-bluetooth';
import { deviceActions } from '@suite-common/wallet-core';

import {
    bluetoothAdapterEventAction,
    bluetoothConnectDeviceEventAction,
    bluetoothDeviceListUpdate,
    bluetoothSelectDeviceAction,
    bluetoothScanStatusAction,
} from '../../actions/bluetooth/bluetoothActions';

export type BluetoothScanStatus = 'running' | 'done';

export type DeviceBluetoothStatus =
    | DeviceConnectionStatus
    | {
          uuid: string;
          type: 'found';
      }
    | {
          type: 'error';
          uuid: string;
          error: string;
      };

export type DeviceBluetoothStatusType = DeviceBluetoothStatus['type'];

export type BluetoothDeviceState = {
    device: BluetoothDevice;
    status: DeviceBluetoothStatus;
};

// found
// pairing
// paired
// bluetooth-connecting
// bluetooth-connected
// connect-connected

type BluetoothState = {
    isBluetoothEnabled: boolean;
    scanStatus: BluetoothScanStatus;

    // This will be persisted, those are devices we believed that are paired
    // (because we already successfully paired them in the Suite) in the Operating System
    pairedDevices: BluetoothDevice[];

    // This list of devices that is union of saved-devices and device that we get from scan
    deviceList: Record<string, BluetoothDeviceState>;

    selectedDeviceUuid?: string; // Todo: this shall be stored in the local component
};

const initialState: BluetoothState = {
    isBluetoothEnabled: true, // To prevent the UI from flickering when the page is loaded
    scanStatus: 'running', // To prevent the UI from flickering when the page is loaded
    deviceList: {},
    selectedDeviceUuid: undefined, // Todo: this shall be stored in the local component
};

export const bluetoothReducer = createReducer(initialState, builder =>
    builder
        .addCase(bluetoothAdapterEventAction, (state, { payload: { isPowered } }) => {
            state.isBluetoothEnabled = isPowered;
            if (!isPowered) {
                state.deviceList = {};
            }
        })
        .addCase(bluetoothDeviceListUpdate, (state, { payload: { devices } }) => {
            devices.forEach(device => {
                // Todo: unifiy connectedDevices (saved in DB) and devices, so we drop devices that are no longer visible

                const deviceState = state.deviceList[device.uuid];

                if (deviceState === undefined) {
                    state.deviceList[device.uuid] = {
                        device,
                        status: { type: 'found', uuid: device.uuid },
                    };
                } else {
                    deviceState.device = device;
                }
            });
        })
        .addCase(bluetoothConnectDeviceEventAction, (state, { payload: { connectionStatus } }) => {
            const device = state.deviceList[connectionStatus.uuid];

            if (device !== undefined) {
                device.status = connectionStatus;
            }
        })
        .addCase(bluetoothSelectDeviceAction, (state, { payload: { uuid } }) => {
            if (uuid === undefined) {
                state.selectedDeviceUuid = undefined;

                return;
            }

            const device = state.deviceList[uuid];

            state.selectedDeviceUuid = uuid;

            if (device !== undefined) {
                device.status = { type: 'pairing', uuid }; // We need to optimistically set the status to pairing so the UI is smooth
            }
        })
        .addCase(bluetoothScanStatusAction, (state, { payload: { status } }) => {
            state.scanStatus = status;
        })

        // TODO: forgetDevice, save reducer to DB
        .addCase(deviceActions.deviceDisconnect, (state, { payload: { bluetoothProps } }) => {
            if (bluetoothProps) {
                delete state.deviceList[bluetoothProps.uuid];
                if (state.selectedDeviceUuid === bluetoothProps.uuid) {
                    state.selectedDeviceUuid = undefined;
                }
            }
        })

        // TODO: forgetDevice, save reducer to DB
        .addCase(
            deviceActions.connectDevice,
            (
                state,
                {
                    payload: {
                        device: { bluetoothProps },
                    },
                },
            ) => {
                if (bluetoothProps) {
                    if (state.selectedDeviceUuid === bluetoothProps.uuid) {
                        state.deviceList[bluetoothProps.uuid].status = {
                            type: 'connect-connected',
                            uuid: bluetoothProps.uuid,
                        };
                    }
                }
            },
        ),
);
