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

type BluetoothState = {
    isBluetoothEnabled: boolean;
    scanStatus: BluetoothScanStatus;
    deviceList: Record<string, BluetoothDeviceState>;
    selectedDeviceUuid?: string;
};

const initialState: BluetoothState = {
    isBluetoothEnabled: true, // To prevent the UI from flickering when the page is loaded
    scanStatus: 'running', // To prevent the UI from flickering when the page is loaded
    deviceList: {},
    selectedDeviceUuid: undefined,
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
        }),
);
