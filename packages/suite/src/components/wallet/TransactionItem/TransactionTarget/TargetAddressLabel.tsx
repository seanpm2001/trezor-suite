import styled from 'styled-components';

import { ArrayElement } from '@trezor/type-utils';
import type { NetworkSymbol } from '@suite-common/wallet-config';

import { WalletAccountTransaction } from 'src/types/wallet';
import { Translation, AddressLabeling } from 'src/components/suite';
import { AccountLabels } from 'src/types/suite/metadata';

const TruncatedSpan = styled.span<{ $isBlurred?: boolean }>`
    overflow: hidden;
    text-overflow: ellipsis;
`;

interface TargetAddressLabelProps {
    symbol: NetworkSymbol;
    target: ArrayElement<WalletAccountTransaction['targets']>;
    type: WalletAccountTransaction['type'];
    accountMetadata?: AccountLabels;
}

export const TargetAddressLabel = ({
    symbol,
    target,
    type,
    accountMetadata,
}: TargetAddressLabelProps) => {
    const isLocalTarget = (type === 'sent' || type === 'self') && target.isAccountTarget;

    if (isLocalTarget) {
        return (
            <TruncatedSpan>
                <Translation id="TR_SENT_TO_SELF" />
            </TruncatedSpan>
        );
    }

    return (
        <TruncatedSpan>
            {target.addresses?.map((a, i) =>
                // either it may be AddressLabeling - sent to another account associated with this device, e.g: "Bitcoin #2"
                // or it may show address metadata label added from receive tab e.g "My address for illegal things"
                type === 'sent' ? (
                    // Using index as a key is safe as the array doesn't change (no filter/reordering, pushing new items)

                    <AddressLabeling key={i} address={a} symbol={symbol} />
                ) : (
                    <span key={i}>{accountMetadata?.addressLabels[a] || a}</span>
                ),
            )}
        </TruncatedSpan>
    );
};
