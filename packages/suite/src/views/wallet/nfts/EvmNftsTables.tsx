import { Banner, H3, Column } from '@trezor/components';
import { SelectedAccountLoaded } from '@suite-common/wallet-types';
import { selectNftDefinitions } from '@suite-common/token-definitions';

import { Translation } from 'src/components/suite';
import { useSelector } from 'src/hooks/suite';
import { getTokens } from 'src/utils/wallet/tokenUtils';

import { NoTokens } from '../tokens/common/NoTokens';
import NftsTable from './NftsTable/NftsTable';

type EvmNftsTablesProps = {
    selectedAccount: SelectedAccountLoaded;
    searchQuery: string;
    isShown: boolean;
};

export const EvmNftsTables = ({
    selectedAccount,
    searchQuery,
    isShown = true,
}: EvmNftsTablesProps) => {
    const nftDefinitions = useSelector(state =>
        selectNftDefinitions(state, selectedAccount.account.symbol),
    );
    const nfts = getTokens({
        tokens: selectedAccount.account.tokens || [],
        symbol: selectedAccount.account.symbol,
        tokenDefinitions: nftDefinitions,
        isNft: true,
        searchQuery,
    });

    const areNoShownNfts = !nfts?.shownWithBalance.length && !nfts?.shownWithoutBalance.length;

    const areNoHiddenNfts = !nfts?.hiddenWithBalance.length && !nfts?.hiddenWithoutBalance.length;

    const areNoUnverifiedNfts =
        !nfts?.unverifiedWithBalance.length && !nfts?.unverifiedWithoutBalance.length;

    const shownEvmNfts = (
        <Column gap={24}>
            <NftsTable
                selectedAccount={selectedAccount}
                type="ERC721"
                isShown={isShown}
                verified
                nfts={nfts}
            />
            <NftsTable
                selectedAccount={selectedAccount}
                type="ERC1155"
                isShown={isShown}
                verified
                nfts={nfts}
            />
        </Column>
    );

    const hiddenEvmNfts = (
        <Column gap={24} alignItems="stretch">
            <NftsTable
                selectedAccount={selectedAccount}
                type="ERC721"
                isShown={false}
                verified={true}
                nfts={nfts}
            />
            <NftsTable
                selectedAccount={selectedAccount}
                type="ERC1155"
                isShown={false}
                verified={true}
                nfts={nfts}
            />
            <H3>
                <Translation id="TR_COLLECTIONS_UNRECOGNIZED_BY_TREZOR" />
            </H3>
            <Banner variant="warning" icon>
                <Translation id="TR_NFT_UNRECOGNIZED_BY_TREZOR_TOOLTIP" />
            </Banner>
            <NftsTable
                selectedAccount={selectedAccount}
                type="ERC721"
                isShown={false}
                verified={false}
                nfts={nfts}
            />
            <NftsTable
                selectedAccount={selectedAccount}
                type="ERC1155"
                isShown={false}
                verified={false}
                nfts={nfts}
            />
        </Column>
    );

    if (isShown) {
        if (areNoShownNfts) {
            return (
                <NoTokens
                    title={
                        <Translation
                            id={
                                nfts?.hiddenWithBalance.length ||
                                nfts?.hiddenWithoutBalance.length ||
                                nfts?.unverifiedWithBalance.length ||
                                nfts?.unverifiedWithoutBalance.length
                                    ? 'TR_NFT_EMPTY_CHECK_HIDDEN'
                                    : 'TR_NFT_EMPTY'
                            }
                        />
                    }
                />
            );
        }

        return shownEvmNfts;
    } else {
        if (areNoHiddenNfts && areNoUnverifiedNfts) {
            return <NoTokens title={<Translation id="TR_HIDDEN_NFT_EMPTY" />} />;
        }

        return hiddenEvmNfts;
    }
};
