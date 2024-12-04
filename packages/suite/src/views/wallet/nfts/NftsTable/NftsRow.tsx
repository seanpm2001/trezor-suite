import { Network } from '@suite-common/wallet-config';
import {
    DefinitionType,
    tokenDefinitionsActions,
    TokenManagementAction,
    EnhancedTokenInfo,
} from '@suite-common/token-definitions';
import {
    Button,
    Column,
    Dropdown,
    GroupedMenuItems,
    Icon,
    Row,
    Table,
    TruncateWithTooltip,
} from '@trezor/components';
import { spacings } from '@trezor/theme';
import { copyToClipboard } from '@trezor/dom-utils';
import { notificationsActions } from '@suite-common/toast-notifications';
import { AddressType } from '@suite-common/wallet-types';
import { EvmNftTokenStandard } from '@trezor/blockchain-link-types';
import { getNftExplorerUrl } from '@suite-common/wallet-utils';

import {
    HiddenPlaceholder,
    RedactNumericalValue,
    Translation,
    TrezorLink,
} from 'src/components/suite';
import { useDispatch, useSelector } from 'src/hooks/suite';
import { SUITE } from 'src/actions/suite/constants';
import { selectIsCopyAddressModalShown } from 'src/reducers/suite/suiteReducer';
import { openModal } from 'src/actions/suite/modalActions';

import { BlurUrls } from '../../tokens/common/BlurUrls';

type NftsRowProps = {
    nft: EnhancedTokenInfo;
    type: EvmNftTokenStandard;
    network: Network;
    isShown?: boolean;
};

const NftsRow = ({ nft, type, network, isShown }: NftsRowProps) => {
    const dispatch = useDispatch();

    const shouldShowCopyAddressModal = useSelector(selectIsCopyAddressModalShown);

    const getNftContractExplorerUrl = (network: Network, nft: EnhancedTokenInfo) => {
        const explorerUrl = network.explorer.account;
        const contractAddress = nft.contract;
        const queryString = network.explorer.queryString ?? '';

        return `${explorerUrl}${contractAddress}${queryString}`;
    };

    const onCopyAddress = (address: string, addressType: AddressType) => {
        if (shouldShowCopyAddressModal) {
            dispatch(
                openModal({
                    type: 'copy-address',
                    addressType,
                    address,
                }),
            );
        } else {
            const result = copyToClipboard(address);
            if (typeof result !== 'string') {
                dispatch(notificationsActions.addToast({ type: 'copy-to-clipboard' }));
            }
        }
    };

    return (
        <Table.Row>
            <Table.Cell colSpan={1}>
                <TruncateWithTooltip>
                    <BlurUrls text={nft.name} />
                </TruncateWithTooltip>
            </Table.Cell>
            {type === 'ERC1155' && (
                <>
                    <Table.Cell align="right" colSpan={1}>
                        <Column alignItems="flex-end">
                            {nft.multiTokenValues?.map((value, index) => (
                                <Row key={nft.contract + index}>
                                    <HiddenPlaceholder>
                                        <TrezorLink
                                            href={getNftExplorerUrl(
                                                network,
                                                nft,
                                                value?.id?.toString(),
                                            )}
                                            target="_blank"
                                            variant="underline"
                                        >
                                            <RedactNumericalValue
                                                value={value.id?.toString() || ''}
                                            />
                                        </TrezorLink>
                                    </HiddenPlaceholder>
                                </Row>
                            ))}
                        </Column>
                    </Table.Cell>
                    <Table.Cell align="right" colSpan={1}>
                        <Column alignItems="flex-end">
                            {nft.multiTokenValues &&
                                nft.multiTokenValues.map((value, index) => (
                                    <Row key={nft.contract + index}>
                                        <HiddenPlaceholder>
                                            <RedactNumericalValue
                                                value={value.value?.toString() || ''}
                                            />
                                        </HiddenPlaceholder>
                                    </Row>
                                ))}
                        </Column>
                    </Table.Cell>
                </>
            )}
            {type === 'ERC721' && (
                <Table.Cell align="right" colSpan={1}>
                    <Column alignItems="flex-end">
                        {nft.ids?.map((id, index) => (
                            <HiddenPlaceholder key={nft.contract + index}>
                                <TrezorLink
                                    href={getNftExplorerUrl(network, nft, id.toString())}
                                    target="_blank"
                                    variant="underline"
                                >
                                    <RedactNumericalValue value={id.toString()} />
                                </TrezorLink>
                            </HiddenPlaceholder>
                        ))}
                    </Column>
                </Table.Cell>
            )}
            <Table.Cell colSpan={1} align="right">
                <Row gap={spacings.xs}>
                    <Dropdown
                        alignMenu="bottom-right"
                        items={
                            [
                                {
                                    key: 'export',
                                    options: [
                                        {
                                            label: <Translation id="TR_HIDE_TOKEN" />,
                                            icon: 'hide',
                                            onClick: () =>
                                                dispatch(
                                                    tokenDefinitionsActions.setTokenStatus({
                                                        symbol: network.symbol,
                                                        contractAddress: nft.contract || '',
                                                        status: TokenManagementAction.HIDE,
                                                        type: DefinitionType.NFT,
                                                    }),
                                                ),
                                            isHidden: isShown === false,
                                        },
                                        {
                                            label: <Translation id="TR_VIEW_ALL_TRANSACTION" />,
                                            icon: 'newspaper',
                                            onClick: () => {
                                                dispatch({
                                                    type: SUITE.SET_TRANSACTION_HISTORY_PREFILL,
                                                    payload: nft.contract || '',
                                                });
                                            },
                                        },
                                        {
                                            label: <Translation id="TR_VIEW_IN_EXPLORER" />,
                                            icon: 'arrowUpRight',
                                            onClick: () => {
                                                window.open(
                                                    getNftContractExplorerUrl(network, nft),
                                                    '_blank',
                                                );
                                            },
                                        },
                                    ],
                                },
                                {
                                    key: 'contract-address',
                                    label: <Translation id="TR_CONTRACT_ADDRESS" />,
                                    options: [
                                        {
                                            label: (
                                                <Row gap={spacings.xxs}>
                                                    {nft.contract}
                                                    <Icon name="copy" size={14} />
                                                </Row>
                                            ),
                                            onClick: () =>
                                                onCopyAddress(nft.contract || '', 'contract'),
                                        },
                                    ],
                                },
                            ].filter(category => category) as GroupedMenuItems[]
                        }
                    />
                    {!isShown && (
                        <Button
                            icon="show"
                            onClick={() => {
                                dispatch(
                                    tokenDefinitionsActions.setTokenStatus({
                                        symbol: network.symbol,
                                        contractAddress: nft.contract || '',
                                        status: TokenManagementAction.SHOW,
                                        type: DefinitionType.NFT,
                                    }),
                                );
                            }}
                            variant="tertiary"
                            size="small"
                        >
                            <Translation id="TR_UNHIDE" />
                        </Button>
                    )}
                </Row>
            </Table.Cell>
        </Table.Row>
    );
};

export default NftsRow;
