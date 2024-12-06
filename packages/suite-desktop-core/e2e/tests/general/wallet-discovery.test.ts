import { test, expect } from '../../support/fixtures';

test.use({
    emulatorStartConf: { wipe: true },
    emulatorSetupConf: { needs_backup: true, mnemonic: 'mnemonic_all' },
});

test.beforeEach(async ({ onboardingPage, dashboardPage }) => {
    await onboardingPage.completeOnboarding();
    await dashboardPage.discoveryShouldFinish();
});
test.describe('Wallet discover tests', { tag: ['@group=wallet'] }, () => {
    /**
     * Test case:
     * 1. Discover a standard wallet
     * 2. Verify discovery by checking a the first btc value under the graph
     */
    test('Discover a standard wallet', async ({ dashboardPage }) => {
        await dashboardPage.openDeviceSwitcher();
        await dashboardPage.ejectWallet();
        await dashboardPage.addStandardWallet();
        await expect(dashboardPage.balanceOfNetwork('btc').first()).toBeVisible();
    });
});
