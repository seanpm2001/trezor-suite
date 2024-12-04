import { SelectedAccountLoaded } from '@suite-common/wallet-types';
import { Card, Column, Table, H3 } from '@trezor/components';
import { getNetwork } from '@suite-common/wallet-config';
import { EnhancedTokenInfo } from '@suite-common/token-definitions';
import { EvmNftTokenStandard } from '@trezor/blockchain-link-types';

import { GetTokensOutputType } from 'src/utils/wallet/tokenUtils';
import { Translation } from 'src/components/suite/Translation';

import NftsRow from './NftsRow';

type NftsTableProps = {
    selectedAccount: SelectedAccountLoaded;
    type: EvmNftTokenStandard;
    isShown?: boolean;
    verified?: boolean;
    nfts: GetTokensOutputType;
};

const NftsTable = ({ selectedAccount, type, isShown, verified, nfts }: NftsTableProps) => {
    const { account } = selectedAccount;
    const network = getNetwork(account.symbol);

    const filterNftsByType = (nfts: EnhancedTokenInfo[]) => {
        return nfts.filter(nft => nft.type === type);
    };

    const getNftsToShow = () => {
        if (isShown) {
            return [...nfts.shownWithBalance, ...nfts.shownWithoutBalance];
        }

        return verified
            ? [...nfts.hiddenWithBalance, ...nfts.hiddenWithoutBalance]
            : [...nfts.unverifiedWithBalance, ...nfts.unverifiedWithoutBalance];
    };

    const nftsToShow = getNftsToShow();
    const filteredNfts = filterNftsByType(nftsToShow);

    return filteredNfts.length > 0 ? (
        <Column width="100%" alignItems="start" gap={12}>
            <H3>{type}</H3>
            <Card paddingType="none" overflow="hidden">
                <Table>
                    <Table.Header>
                        <Table.Row>
                            <Table.Cell colSpan={1}>
                                <Translation id="TR_COLLECTION_NAME" />
                            </Table.Cell>
                            {type === 'ERC1155' && (
                                <>
                                    <Table.Cell align="right" colSpan={1}>
                                        <Translation id="TR_TOKEN_ID" />
                                    </Table.Cell>

                                    <Table.Cell align="right" colSpan={1}>
                                        <Translation id="TR_QUANTITY" />
                                    </Table.Cell>
                                </>
                            )}
                            {type === 'ERC721' && (
                                <Table.Cell align="right" colSpan={1}>
                                    <Translation id="TR_TOKEN_ID" />
                                </Table.Cell>
                            )}
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {filteredNfts.map(nft => (
                            <NftsRow
                                nft={nft}
                                key={nft.contract}
                                type={type}
                                network={network}
                                isShown={isShown}
                            />
                        ))}
                    </Table.Body>
                </Table>
            </Card>
        </Column>
    ) : null;
};

export default NftsTable;
