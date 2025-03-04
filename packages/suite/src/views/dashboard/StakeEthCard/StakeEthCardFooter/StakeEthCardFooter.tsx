import { Button, Paragraph, Row } from '@trezor/components';
import { spacings } from '@trezor/theme';

import { Translation } from 'src/components/suite';
import { useAccountSearch, useDispatch } from 'src/hooks/suite';
import { goto } from 'src/actions/suite/routerActions';

import { NetworkBadge } from './NetworkBadge';

type StakeEthCardFooterProps = {
    accountIndex: number | undefined;
    hideSection: () => void;
};

export const StakeEthCardFooter = ({ accountIndex = 0, hideSection }: StakeEthCardFooterProps) => {
    const dispatch = useDispatch();
    const { setCoinFilter, setSearchString } = useAccountSearch();
    const goToEthStakingTab = () => {
        dispatch(
            goto('wallet-staking', {
                params: {
                    symbol: 'eth',
                    accountIndex,
                    accountType: 'normal',
                },
            }),
        );
        // activate coin filter and reset account search string
        setCoinFilter('eth');
        setSearchString(undefined);
    };

    return (
        <Row justifyContent="space-between" alignItems="center" gap={spacings.xs}>
            <div>
                <Paragraph variant="tertiary" typographyStyle="label">
                    <Translation id="TR_AVAILABLE_NOW_FOR" />
                </Paragraph>
                <NetworkBadge symbol="eth" name={<Translation id="TR_NETWORK_ETHEREUM" />} />
            </div>

            <Row gap={spacings.xs}>
                <Button onClick={goToEthStakingTab}>
                    <Translation id="TR_STAKE_START_STAKING" />
                </Button>
                <Button variant="tertiary" onClick={hideSection}>
                    <Translation id="TR_MAYBE_LATER" />
                </Button>
            </Row>
        </Row>
    );
};
