import { isLinux } from '@trezor/env-utils';
import { Translation, TroubleshootingTips } from 'src/components/suite';
import {
    TROUBLESHOOTING_TIP_BRIDGE_STATUS,
    TROUBLESHOOTING_TIP_SUITE_DESKTOP,
    TROUBLESHOOTING_TIP_CABLE,
    TROUBLESHOOTING_TIP_USB,
    TROUBLESHOOTING_TIP_DIFFERENT_COMPUTER,
    TROUBLESHOOTING_TIP_UDEV,
} from 'src/components/suite/troubleshooting/tips';
import type { TrezorDevice } from 'src/types/suite';

interface DeviceUnreadableProps {
    device?: TrezorDevice; // this should be actually UnreadableDevice, but it is not worth type casting
    isWebUsbTransport: boolean;
}

// We don't really know what happened, show some generic help and provide link to contact a support
export const DeviceUnreadable = ({ device, isWebUsbTransport }: DeviceUnreadableProps) => {
    if (isWebUsbTransport) {
        // only install bridge will help (webusb + HID device)
        return (
            <TroubleshootingTips
                label={<Translation id="TR_TROUBLESHOOTING_UNREADABLE_WEBUSB" />}
                items={[TROUBLESHOOTING_TIP_BRIDGE_STATUS, TROUBLESHOOTING_TIP_SUITE_DESKTOP]}
                offerWebUsb
                data-testid="@connect-device-prompt/unreadable-hid"
            />
        );
    }

    return (
        <TroubleshootingTips
            label={
                <Translation
                    id="TR_TROUBLESHOOTING_UNREADABLE_UNKNOWN"
                    values={{ error: device?.error }}
                />
            }
            items={[
                // this error is dispatched by trezord when udev rules are missing
                ...(isLinux() && device?.error === 'LIBUSB_ERROR_ACCESS'
                    ? [TROUBLESHOOTING_TIP_UDEV]
                    : []),

                // standard errors
                TROUBLESHOOTING_TIP_CABLE,
                TROUBLESHOOTING_TIP_USB,
                TROUBLESHOOTING_TIP_DIFFERENT_COMPUTER,
            ]}
            offerWebUsb={isWebUsbTransport}
            data-testid="@connect-device-prompt/unreadable-unknown"
        />
    );
};
