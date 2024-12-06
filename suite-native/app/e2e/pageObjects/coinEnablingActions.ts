import { scrollUntilVisible } from '../utils';

class OnCoinEnablingInit {
    async waitForScreen() {
        await waitFor(element(by.id('@screen/CoinEnablingInit')))
            .toBeVisible()
            .withTimeout(10000);
    }

    async enableNetwork(symbol: string) {
        const networkIdMatcher = by.id(`@coin-enabling/toggle-${symbol}`);
        await scrollUntilVisible(networkIdMatcher);
        await element(networkIdMatcher).tap();
    }

    async clickOnConfirmButton() {
        await element(by.id('@coin-enabling/button-save')).tap();
    }
}

export const onCoinEnablingInit = new OnCoinEnablingInit();
