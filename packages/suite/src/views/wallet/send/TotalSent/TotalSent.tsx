import styled from 'styled-components';

import { Card, Column, InfoItem } from '@trezor/components';
import { formatNetworkAmount, formatAmount } from '@suite-common/wallet-utils';
import { spacings } from '@trezor/theme';

import { useSendFormContext } from 'src/hooks/wallet';
import { Translation, FiatValue, FormattedCryptoAmount } from 'src/components/suite';

import { ReviewButton } from './ReviewButton';

const Container = styled.div`
    position: sticky;
    top: 80px;
`;

export const TotalSent = () => {
    const {
        account: { symbol, networkType },
        composedLevels,
        getValues,
    } = useSendFormContext();

    const selectedFee = getValues().selectedFee || 'normal';
    const transactionInfo = composedLevels ? composedLevels[selectedFee] : undefined;
    const isTokenTransfer = networkType === 'ethereum' && !!getValues('outputs.0.token');
    const hasTransactionInfo = transactionInfo && transactionInfo.type !== 'error';
    const tokenInfo = hasTransactionInfo ? transactionInfo.token : undefined;

    return (
        <Container>
            <Card height="min-content" fillType="none">
                <Column gap={spacings.xxs} margin={{ bottom: spacings.xl }}>
                    <InfoItem
                        label={<Translation id="TOTAL_SENT" />}
                        direction="row"
                        variant="default"
                        typographyStyle="body"
                    >
                        {hasTransactionInfo && (
                            <FormattedCryptoAmount
                                disableHiddenPlaceholder
                                value={
                                    tokenInfo
                                        ? formatAmount(
                                              transactionInfo.totalSpent,
                                              tokenInfo.decimals,
                                          )
                                        : formatNetworkAmount(transactionInfo.totalSpent, symbol)
                                }
                                symbol={tokenInfo?.symbol ?? symbol}
                            />
                        )}
                    </InfoItem>
                    <InfoItem
                        label={<Translation id={isTokenTransfer ? 'FEE' : 'INCLUDING_FEE'} />}
                        direction="row"
                    >
                        {hasTransactionInfo &&
                            (tokenInfo ? (
                                <FormattedCryptoAmount
                                    disableHiddenPlaceholder
                                    value={formatNetworkAmount(transactionInfo.fee, symbol)}
                                    symbol={symbol}
                                />
                            ) : (
                                <FiatValue
                                    disableHiddenPlaceholder
                                    amount={formatNetworkAmount(transactionInfo.totalSpent, symbol)}
                                    symbol={symbol}
                                />
                            ))}
                    </InfoItem>
                </Column>
                <ReviewButton />
            </Card>
        </Container>
    );
};
