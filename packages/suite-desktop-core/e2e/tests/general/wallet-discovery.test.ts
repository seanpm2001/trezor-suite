import { TrezorUserEnvLink } from '@trezor/trezor-user-env-link';

import { test, expect } from '../../support/fixtures';

test.beforeAll(async () => {
    await TrezorUserEnvLink.connect();
    await TrezorUserEnvLink.startEmu({ wipe: true });
    await TrezorUserEnvLink.setupEmu({
        needs_backup: true,
        mnemonic: 'mnemonic_all',
    });
    await TrezorUserEnvLink.startBridge();
});

test.afterAll(async () => {
    await TrezorUserEnvLink.stopBridge();
    await TrezorUserEnvLink.stopEmu();
})

test.describe('Wallet discover tests', { tag: ['@group=wallet'] }, () => {
    /**
     * Test case:
     * 1. Discover a standard wallet
     * 2. Verify discovery by checking a the first btc value under the graph
     */
    test('Discover a standard wallet', async ({ onboardingPage, dashboardPage }) => {
        await onboardingPage.completeOnboarding();
        await dashboardPage.discoveryShouldFinish();
        await dashboardPage.openDeviceSwitcher();
        await dashboardPage.ejectWallet();
        await dashboardPage.addStandardWallet();
        await expect(dashboardPage.balanceOfNetwork('btc').first()).toBeVisible();
    });
});
