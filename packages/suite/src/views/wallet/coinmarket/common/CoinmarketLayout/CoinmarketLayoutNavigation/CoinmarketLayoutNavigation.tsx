import { IconName, SelectBar } from '@trezor/components';
import { Route } from '@suite-common/suite-types';

import { Translation } from '../../../../../../components/suite';
import { goto } from '../../../../../../actions/suite/routerActions';
import { useDispatch, useSelector } from '../../../../../../hooks/suite';

const options = [
    {
        label: <Translation id="TR_NAV_BUY" />,
        value: 'wallet-coinmarket-buy' as Route['name'],
        icon: 'plus' as IconName,
    },
    {
        label: <Translation id="TR_NAV_SELL" />,
        value: 'wallet-coinmarket-sell' as Route['name'],
        icon: 'minus' as IconName,
    },
    {
        label: <Translation id="TR_NAV_DCA" />,
        value: 'wallet-coinmarket-dca' as Route['name'],
        icon: 'clock' as IconName,
    },
];

export const CoinmarketLayoutNavigation = () => {
    const dispatch = useDispatch();
    const routeName = useSelector(state => state.router.route?.name);
    const onChange = (newRoute: Route['name']) => {
        dispatch(goto(newRoute));
    };

    return <SelectBar selectedOption={routeName} options={options} onChange={onChange} />;
};
