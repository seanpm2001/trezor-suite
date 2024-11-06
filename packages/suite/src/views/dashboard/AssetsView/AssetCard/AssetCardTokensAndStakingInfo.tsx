import { Row, Column, Icon, Divider, Text } from '@trezor/components';
import { NetworkSymbol } from '@suite-common/wallet-config';
import { spacings } from '@trezor/theme';
import { Account } from '@suite-common/wallet-types';

import { CoinBalance, FiatValue, HiddenPlaceholder, Translation } from 'src/components/suite';
import { TokenIconSetWrapper } from 'src/components/wallet/TokenIconSetWrapper';

type AssetCardTokensAndStakingInfoProps = {
    symbol: NetworkSymbol;
    tokensFiatBalance: string;
    assetStakingBalance: string;
    shouldRenderStaking: boolean;
    shouldRenderTokens: boolean;
    accounts: Account[];
};

export const AssetCardTokensAndStakingInfo = ({
    symbol,
    tokensFiatBalance,
    assetStakingBalance,
    shouldRenderStaking,
    shouldRenderTokens,
    accounts,
}: AssetCardTokensAndStakingInfoProps) => (
    <Column alignItems="stretch">
        <Divider strokeWidth={1} margin={{ top: spacings.xs, bottom: spacings.xs }} />
        {shouldRenderStaking && (
            <Row
                justifyContent="space-between"
                margin={{ left: spacings.xs, right: spacings.xs, bottom: spacings.xs }}
            >
                <Row gap={spacings.xs}>
                    <Icon name="piggyBankFilled" variant="tertiary" />

                    <Text typographyStyle="body" variant="tertiary">
                        <Translation id="TR_NAV_STAKING" />
                    </Text>
                </Row>
                {assetStakingBalance && (
                    <>
                        <HiddenPlaceholder>
                            <Text typographyStyle="hint" variant="tertiary">
                                <CoinBalance value={assetStakingBalance} symbol={symbol} />
                            </Text>
                        </HiddenPlaceholder>
                        <HiddenPlaceholder>
                            <FiatValue amount={assetStakingBalance} symbol={symbol} />
                        </HiddenPlaceholder>
                    </>
                )}
            </Row>
        )}
        {shouldRenderTokens && (
            <Row
                justifyContent="space-between"
                margin={{ left: spacings.xs, right: spacings.xs, bottom: spacings.xs }}
            >
                <Row gap={spacings.xs}>
                    <TokenIconSetWrapper accounts={accounts} network={symbol} />
                    <Text typographyStyle="body" variant="tertiary">
                        <Translation id="TR_NAV_TOKENS" />
                    </Text>
                </Row>
                <FiatValue
                    amount={tokensFiatBalance ?? '0'}
                    symbol={symbol}
                    shouldConvert={false}
                />
            </Row>
        )}
    </Column>
);
