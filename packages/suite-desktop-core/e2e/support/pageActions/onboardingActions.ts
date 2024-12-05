import { Locator, Page, TestInfo, expect } from '@playwright/test';

import { Model, TrezorUserEnvLink } from '@trezor/trezor-user-env-link';
import { SUITE as SuiteActions } from '@trezor/suite/src/actions/suite/constants';

import { PlaywrightProjects } from '../../playwright.config';

export class OnboardingActions {
    readonly model: Model;
    readonly testInfo: TestInfo;
    readonly welcomeTitle: Locator;
    readonly analyticsHeading: Locator;
    readonly analyticsContinueButton: Locator;
    readonly onboardingContinueButton: Locator;
    readonly onboardingViewOnlySkipButton: Locator;
    readonly viewOnlyTooltipGotItButton: Locator;
    readonly connectDevicePrompt: Locator;
    readonly authenticityStartButton: Locator;
    readonly authenticityContinueButton: Locator;
    isModelWithSecureElement = () => ['T2B1', 'T3T1'].includes(this.model);

    constructor(
        public window: Page,
        model: Model,
        testInfo: TestInfo,
    ) {
        this.model = model;
        this.testInfo = testInfo;
        this.welcomeTitle = this.window.getByTestId('@welcome/title');
        this.analyticsHeading = this.window.getByTestId('@analytics/consent/heading');
        this.analyticsContinueButton = this.window.getByTestId('@analytics/continue-button');
        this.onboardingContinueButton = this.window.getByTestId('@onboarding/exit-app-button');
        this.onboardingViewOnlySkipButton = this.window.getByTestId('@onboarding/viewOnly/skip');
        this.viewOnlyTooltipGotItButton = this.window.getByTestId('@viewOnlyTooltip/gotIt');
        this.connectDevicePrompt = this.window.getByTestId('@connect-device-prompt');
        this.authenticityStartButton = this.window.getByTestId('@authenticity-check/start-button');
        this.authenticityContinueButton = this.window.getByTestId(
            '@authenticity-check/continue-button',
        );
    }

    async optionallyDismissFwHashCheckError() {
        await expect(this.welcomeTitle).toBeVisible({ timeout: 10000 });
        // dismisses the error modal only if it appears (handle it async in parallel, not necessary to block the rest of the flow)
        this.window
            .$('[data-testid="@device-compromised/back-button"]')
            .then(dismissFwHashCheckButton => dismissFwHashCheckButton?.click());
    }

    async completeOnboarding() {
        if (this.testInfo.project.name === PlaywrightProjects.Web) {
            await this.disableFirmwareHashCheck();
        }
        await this.optionallyDismissFwHashCheckError();
        await this.analyticsContinueButton.click();
        await this.onboardingContinueButton.click();
        if (this.isModelWithSecureElement()) {
            await this.authenticityStartButton.click();
            await TrezorUserEnvLink.pressYes();
            await this.authenticityContinueButton.click();
        }
        await this.onboardingViewOnlySkipButton.click();
        await this.viewOnlyTooltipGotItButton.click();
    }

    async disableFirmwareHashCheck() {
        // Desktop starts with already disabled firmware hash check. Web needs to disable it.
        await expect(this.welcomeTitle).toBeVisible({ timeout: 10000 });
        // eslint-disable-next-line @typescript-eslint/no-shadow
        await this.window.evaluate(SuiteActions => {
            window.store.dispatch({
                type: SuiteActions.DEVICE_FIRMWARE_HASH_CHECK,
                payload: { isDisabled: true },
            });
            window.store.dispatch({
                type: SuiteActions.SET_DEBUG_MODE,
                payload: { showDebugMenu: true },
            });
        }, SuiteActions);
    }
}
