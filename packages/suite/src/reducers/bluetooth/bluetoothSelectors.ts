import { AppState } from '../store';

export const selectBluetoothEnabled = (state: AppState) => state.bluetooth.isBluetoothEnabled;

export const selectBluetoothDeviceList = (state: AppState) =>
    Object.values(state.bluetooth.deviceList);

export const selectBluetoothScanStatus = (state: AppState) => state.bluetooth.scanStatus;

export const selectBluetoothSelectedDevice = (state: AppState) =>
    state.bluetooth.selectedDeviceUuid !== undefined
        ? state.bluetooth.deviceList[state.bluetooth.selectedDeviceUuid]
        : undefined;
