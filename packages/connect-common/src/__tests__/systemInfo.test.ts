import {
    getBrowserVersion,
    getBrowserName,
    getDeviceType,
    getUserAgent,
    getOsFamily,
} from '@trezor/env-utils';

import { getInstallerPackage, getSystemInfo } from '../systemInfo'; // replace with your actual file

jest.mock('@trezor/env-utils', () => ({
    getBrowserVersion: jest.fn(),
    getBrowserName: jest.fn(),
    getDeviceType: jest.fn(),
    getUserAgent: jest.fn(),
    getOsFamily: jest.fn(),
}));

describe('getInstallerPackage', () => {
    it('should return mac for MacOS', () => {
        (getOsFamily as jest.Mock).mockReturnValue('MacOS');
        expect(getInstallerPackage()).toBe('mac');
    });

    it('should return win64 for Windows 64-bit', () => {
        (getOsFamily as jest.Mock).mockReturnValue('Windows');
        (getUserAgent as jest.Mock).mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        expect(getInstallerPackage()).toBe('win64');
    });

    it('should return win32 for Windows 32-bit', () => {
        (getOsFamily as jest.Mock).mockReturnValue('Windows');
        (getUserAgent as jest.Mock).mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win32; x86)');
        expect(getInstallerPackage()).toBe('win32');
    });

    it('should return rpm64 for Linux RPM 64-bit', () => {
        (getOsFamily as jest.Mock).mockReturnValue('Linux');
        (getUserAgent as jest.Mock).mockReturnValue('Mozilla/5.0 (X11; Fedora x86_64; Linux)');
        expect(getInstallerPackage()).toBe('rpm64');
    });

    it('should return deb32 for Linux DEB 32-bit', () => {
        (getOsFamily as jest.Mock).mockReturnValue('Linux');
        (getUserAgent as jest.Mock).mockReturnValue('Mozilla/5.0 (X11; Linux i686)');
        expect(getInstallerPackage()).toBe('deb32');
    });

    it('should return undefined for unsupported OS', () => {
        (getOsFamily as jest.Mock).mockReturnValue('UnknownOS');
        expect(getInstallerPackage()).toBeUndefined();
    });
});

describe('getSystemInfo', () => {
    const supportedBrowsers = {
        chrome: { version: 90 },
        firefox: { version: 85 },
    };

    it('should return supported browser info when browser is up-to-date', () => {
        (getBrowserName as jest.Mock).mockReturnValue('chrome');
        (getBrowserVersion as jest.Mock).mockReturnValue('90');
        (getDeviceType as jest.Mock).mockReturnValue('desktop');
        (getOsFamily as jest.Mock).mockReturnValue('Windows');

        const result = getSystemInfo(supportedBrowsers);

        expect(result).toEqual({
            os: {
                family: 'Windows',
                mobile: false,
            },
            browser: {
                supported: true,
                outdated: false,
            },
        });
    });

    it('should return outdated browser info when browser version is older', () => {
        (getBrowserName as jest.Mock).mockReturnValue('firefox');
        (getBrowserVersion as jest.Mock).mockReturnValue('80');
        (getDeviceType as jest.Mock).mockReturnValue('desktop');
        (getOsFamily as jest.Mock).mockReturnValue('Linux');

        const result = getSystemInfo(supportedBrowsers);

        expect(result).toEqual({
            os: {
                family: 'Linux',
                mobile: false,
            },
            browser: {
                supported: false,
                outdated: true,
            },
        });
    });

    it('should return unsupported for unknown browser', () => {
        (getBrowserName as jest.Mock).mockReturnValue('unknown');
        (getBrowserVersion as jest.Mock).mockReturnValue('1');
        (getDeviceType as jest.Mock).mockReturnValue('desktop');
        (getOsFamily as jest.Mock).mockReturnValue('MacOS');

        const result = getSystemInfo(supportedBrowsers);

        expect(result).toEqual({
            os: {
                family: 'MacOS',
                mobile: false,
            },
            browser: {
                supported: false,
                outdated: false,
            },
        });
    });

    it('should return unsupported for iOS mobile device', () => {
        (getBrowserName as jest.Mock).mockReturnValue('safari');
        (getBrowserVersion as jest.Mock).mockReturnValue('14');
        (getDeviceType as jest.Mock).mockReturnValue('mobile');
        (getOsFamily as jest.Mock).mockReturnValue('MacOS');

        const result = getSystemInfo(supportedBrowsers);

        expect(result).toEqual({
            os: {
                family: 'MacOS',
                mobile: true,
            },
            browser: {
                supported: false,
                outdated: false,
            },
        });
    });
});
