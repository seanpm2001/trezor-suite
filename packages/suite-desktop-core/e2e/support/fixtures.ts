/* eslint-disable react-hooks/rules-of-hooks */

import { test as base, BrowserContext, ElectronApplication, Page } from '@playwright/test';

import { DashboardActions } from './pageActions/dashboardActions';
import { launchSuite } from './common';
import { SettingsActions } from './pageActions/settingsActions';
import { SuiteGuide } from './pageActions/suiteGuideActions';
import { TopBarActions } from './pageActions/topBarActions';
import { WalletActions } from './pageActions/walletActions';
import { OnboardingActions } from './pageActions/onboardingActions';
import { PlaywrightProjects } from '../playwright.config';

type Fixtures = {
    appContext: ElectronApplication | BrowserContext;
    window: Page;
    dashboardPage: DashboardActions;
    settingsPage: SettingsActions;
    suiteGuidePage: SuiteGuide;
    topBar: TopBarActions;
    walletPage: WalletActions;
    onboardingPage: OnboardingActions;
};

const test = base.extend<Fixtures>({
    appContext: async ({ browser, baseURL }, use, testInfo) => {

        if (testInfo.project.name === PlaywrightProjects.Desktop) {
            const suite = await launchSuite();
            await use(suite.electronApp);
            await suite.electronApp.close(); // Ensure cleanup after tests
        } else {
            console.log('Base URL:', baseURL);
            const appContext = await browser.newContext({ baseURL });
            await use(appContext);
        }
    },
    window: async ({ appContext }, use, testInfo) => {
        if ('firstWindow' in appContext) {
            const window = await appContext.firstWindow();

            await window.context().tracing.start({ screenshots: true, snapshots: true });
            await use(window);
            const tracePath = `${testInfo.outputDir}/trace.electron.zip`;
            await window.context().tracing.stop({ path: tracePath });
        } else {
            const window = await appContext.newPage();
            await window.goto('/');
            await use(window);
        }
    },
    dashboardPage: async ({ window }, use) => {
        const dashboardPage = new DashboardActions(window);
        await use(dashboardPage);
    },
    settingsPage: async ({ window }, use) => {
        const settingsPage = new SettingsActions(window);
        await use(settingsPage);
    },
    suiteGuidePage: async ({ window }, use) => {
        const suiteGuidePage = new SuiteGuide(window);
        await use(suiteGuidePage);
    },
    topBar: async ({ window }, use) => {
        const topBar = new TopBarActions(window);
        await use(topBar);
    },
    walletPage: async ({ window }, use) => {
        const walletPage = new WalletActions(window);
        await use(walletPage);
    },
    onboardingPage: async ({ window }, use) => {
        const onboardingPage = new OnboardingActions(window);
        await use(onboardingPage);
    },
});

export { test };
export { expect } from '@playwright/test';
