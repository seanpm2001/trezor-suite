import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';

import { ReceiveStackNavigator } from '@suite-native/module-receive';
import { HomeStackNavigator } from '@suite-native/module-home';
import { AccountsStackNavigator } from '@suite-native/module-accounts-management';
import { SettingsStackNavigator } from '@suite-native/module-settings';
import { AppTabsRoutes } from '@suite-native/navigation';
import { useHandleDeviceRequestsPassphrase } from '@suite-native/device-authorization';
import { useNativeStyles } from '@trezor/styles';
import { useTranslate } from '@suite-native/intl';

const Tab = createNativeBottomTabNavigator();

export const AppTabNavigator = () => {
    useHandleDeviceRequestsPassphrase();
    const { utils } = useNativeStyles();
    const { translate } = useTranslate();

    return (
        <Tab.Navigator
            initialRouteName={AppTabsRoutes.HomeStack}
            tabLabelStyle={{
                fontFamily: utils.typography.label.fontFamily,
                fontSize: utils.typography.label.fontSize,
            }}
            barTintColor={utils.colors.backgroundSurfaceElevation0}
            tabBarActiveTintColor={utils.colors.iconPrimaryDefault}
            activeIndicatorColor={utils.colors.backgroundNeutralDisabled}
            tabBarInactiveTintColor={utils.colors.iconDisabled}
            // disable page animations because it looks strange with device switcher
            // we should try to move device switcher outside of navigator
            disablePageAnimations
            labeled={false}
        >
            <Tab.Screen
                name={AppTabsRoutes.HomeStack}
                component={HomeStackNavigator}
                options={{
                    tabBarIcon: () => require('@suite-common/icons/assets/house.svg'),
                    tabBarLabel: translate('tabBar.home'),
                }}
                key={`@tabBar/${AppTabsRoutes.HomeStack}`}
            />
            <Tab.Screen
                name={AppTabsRoutes.AccountsStack}
                component={AccountsStackNavigator}
                options={{
                    tabBarIcon: () => require('@suite-common/icons/assets/discover.svg'),
                    tabBarLabel: translate('tabBar.accounts'),
                }}
                key={`@tabBar/${AppTabsRoutes.AccountsStack}`}
            />
            <Tab.Screen
                name={AppTabsRoutes.ReceiveStack}
                component={ReceiveStackNavigator}
                options={{
                    tabBarIcon: () => require('@suite-common/icons/assets/arrowLineDown.svg'),
                    tabBarLabel: translate('tabBar.receive'),
                }}
                key={`@tabBar/${AppTabsRoutes.ReceiveStack}`}
            />
            <Tab.Screen
                name={AppTabsRoutes.SettingsStack}
                component={SettingsStackNavigator}
                options={{
                    tabBarIcon: () => require('@suite-common/icons/assets/gear.svg'),
                    tabBarLabel: translate('tabBar.settings'),
                }}
                key={`@tabBar/${AppTabsRoutes.SettingsStack}`}
            />
        </Tab.Navigator>
    );
};
