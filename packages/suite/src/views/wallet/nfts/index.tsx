import { useState, useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';

import { WalletLayout } from 'src/components/wallet';
import { useDispatch, useSelector } from 'src/hooks/suite';
import { goto } from 'src/actions/suite/routerActions';

import { TokensNavigation } from '../tokens/TokensNavigation';
import { EvmNftsTables } from './EvmNftsTables';

export const Nfts = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const { selectedAccount } = useSelector(state => state.wallet);

    const dispatch = useDispatch();

    useEffect(() => {
        if (
            selectedAccount.status === 'loaded' &&
            !selectedAccount.network?.features.includes('nfts')
        ) {
            dispatch(goto('wallet-index', { preserveParams: true }));
        }
    }, [selectedAccount, dispatch]);

    if (selectedAccount.status !== 'loaded') {
        return <WalletLayout title="TR_NFT" account={selectedAccount} />;
    }

    return (
        <WalletLayout title="TR_NFT" account={selectedAccount} isSubpage={false}>
            <TokensNavigation
                selectedAccount={selectedAccount}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isNft
            />
            <Switch>
                <Route path={`${process.env.ASSET_PREFIX}/accounts/nfts/hidden`}>
                    <EvmNftsTables
                        selectedAccount={selectedAccount}
                        searchQuery={searchQuery}
                        isShown={false}
                    />
                </Route>
                <Route path="*">
                    <EvmNftsTables
                        selectedAccount={selectedAccount}
                        searchQuery={searchQuery}
                        isShown
                    />
                </Route>
            </Switch>
        </WalletLayout>
    );
};

export default Nfts;
