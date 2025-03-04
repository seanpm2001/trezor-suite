import React from 'react';
import { useSelector } from 'react-redux';

import { BulletList } from '@trezor/components';
import { spacings } from '@trezor/theme';
import {
    selectAccountStakeTransactions,
    selectValidatorsQueue,
    TransactionsRootState,
    StakeRootState,
    selectPoolStatsApyData,
    AccountsRootState,
} from '@suite-common/wallet-core';

import { Translation } from 'src/components/suite';
import { getDaysToAddToPool } from 'src/utils/suite/stake';
import { CoinjoinRootState } from 'src/reducers/wallet/coinjoinReducer';

import { InfoRow } from './InfoRow';

interface StakingInfoProps {
    isExpanded?: boolean;
}

export const StakingInfo = ({ isExpanded }: StakingInfoProps) => {
    const { account } = useSelector((state: CoinjoinRootState) => state.wallet.selectedAccount);

    const { data } =
        useSelector((state: StakeRootState) => selectValidatorsQueue(state, account?.symbol)) || {};

    const stakeTxs = useSelector((state: TransactionsRootState & AccountsRootState) =>
        selectAccountStakeTransactions(state, account?.key ?? ''),
    );

    const ethApy = useSelector((state: StakeRootState) =>
        selectPoolStatsApyData(state, account?.symbol),
    );

    if (!account) return null;

    const daysToAddToPool = getDaysToAddToPool(stakeTxs, data);

    const infoRows = [
        {
            heading: <Translation id="TR_STAKE_SIGN_TRANSACTION" />,
            content: { text: <Translation id="TR_COINMARKET_NETWORK_FEE" />, isBadge: true },
        },
        {
            heading: <Translation id="TR_STAKE_ENTER_THE_STAKING_POOL" />,
            subheading: (
                <Translation
                    id="TR_STAKING_GETTING_READY"
                    values={{ symbol: account.symbol.toUpperCase() }}
                />
            ),
            content: {
                text: (
                    <>
                        ~<Translation id="TR_STAKE_DAYS" values={{ count: daysToAddToPool }} />
                    </>
                ),
            },
        },
        {
            heading: <Translation id="TR_STAKE_EARN_REWARDS_WEEKLY" />,
            subheading: <Translation id="TR_STAKING_REWARDS_ARE_RESTAKED" />,
            content: { text: `~${ethApy}% p.a.` },
        },
    ];

    return (
        <BulletList
            bulletGap={spacings.sm}
            gap={spacings.md}
            bulletSize="small"
            titleGap={spacings.xxxs}
        >
            {infoRows.map(({ heading, content, subheading }, index) => (
                <InfoRow key={index} {...{ heading, subheading, content, isExpanded }} />
            ))}
        </BulletList>
    );
};
