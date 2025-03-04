import { FC, useEffect, PropsWithChildren } from 'react';

import {
    selectDevice,
    selectIsFirmwareAuthenticityCheckDismissed,
} from '@suite-common/wallet-core';

import { useDispatch, useSelector } from 'src/hooks/suite';
import { Onboarding } from 'src/views/onboarding';
import { ErrorPage } from 'src/views/suite/ErrorPage';
import { useGuideKeyboard } from 'src/hooks/guide';
import { init } from 'src/actions/suite/initAction';
import type { AppState } from 'src/types/suite';
import {
    selectPrerequisite,
    selectIsLoggedOut,
    selectSuiteFlags,
    selectIsFirmwareAuthenticityCheckEnabledAndHardFailed,
    selectTransport,
} from 'src/reducers/suite/suiteReducer';
import { SuiteStart } from 'src/views/start/SuiteStart';
import { ViewOnlyPromo } from 'src/views/view-only/ViewOnlyPromo';
import { useWindowVisibility } from 'src/hooks/suite/useWindowVisibility';

import { SuiteLayout } from '../layouts/SuiteLayout/SuiteLayout';
import { InitialLoading } from './InitialLoading';
import { DatabaseUpgradeModal } from './DatabaseUpgradeModal';
import { PrerequisitesGuide } from '../PrerequisitesGuide/PrerequisitesGuide';
import { LoggedOutLayout } from '../layouts/LoggedOutLayout';
import { WelcomeLayout } from '../layouts/WelcomeLayout/WelcomeLayout';
import { DeviceCompromised } from '../SecurityCheck/DeviceCompromised';
import { RouterAppWithParams } from '../../../constants/suite/routes';
import { useReportDeviceCompromised } from '../SecurityCheck/useReportDeviceCompromised';

const ROUTES_TO_SKIP_FIRMWARE_CHECK: RouterAppWithParams['app'][] = [
    'settings',
    'firmware',
    'firmware-type',
    'firmware-custom',
];

const getFullscreenApp = (route: AppState['router']['route']): FC | undefined => {
    switch (route?.app) {
        case 'start':
            return SuiteStart;
        case 'onboarding':
            return Onboarding;
        default:
            return undefined;
    }
};

// Preloader is a top level wrapper used in _app.tsx.
// Decides which content should be displayed basing on route and prerequisites.
export const Preloader = ({ children }: PropsWithChildren) => {
    const lifecycle = useSelector(state => state.suite.lifecycle);
    const transport = useSelector(selectTransport);
    const router = useSelector(state => state.router);
    const prerequisite = useSelector(selectPrerequisite);
    const isLoggedOut = useSelector(selectIsLoggedOut);
    const selectedDevice = useSelector(selectDevice);
    const { initialRun, viewOnlyPromoClosed } = useSelector(selectSuiteFlags);
    const isFirmwareCheckFailed = useSelector(
        selectIsFirmwareAuthenticityCheckEnabledAndHardFailed,
    );
    const isFirmwareAuthenticityCheckDismissed = useSelector(
        selectIsFirmwareAuthenticityCheckDismissed,
    );

    // report firmware authenticity failures even when the UI is disabled
    useReportDeviceCompromised();

    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(init());
    }, [dispatch]);

    // Register keyboard handlers for opening/closing Guide using keyboard
    useGuideKeyboard();
    useWindowVisibility();

    if (lifecycle.status === 'error') {
        throw new Error(lifecycle.error);
    }
    if (lifecycle.status === 'db-error') {
        return <DatabaseUpgradeModal variant={lifecycle.error} />;
    }

    // @trezor/connect was initialized, but didn't emit "TRANSPORT" event yet (it could take a while)
    // display Loader as full page view
    if (lifecycle.status !== 'ready' || !router.loaded || !transport) {
        return <InitialLoading timeout={90} />;
    }

    if (
        (router.route?.app === undefined ||
            !ROUTES_TO_SKIP_FIRMWARE_CHECK.includes(router.route?.app)) &&
        !isFirmwareAuthenticityCheckDismissed &&
        isFirmwareCheckFailed
    ) {
        return <DeviceCompromised />;
    }

    if (
        router.route?.app !== 'settings' &&
        !initialRun &&
        !viewOnlyPromoClosed &&
        selectedDevice?.connected === true &&
        selectedDevice?.remember !== true
    ) {
        return <ViewOnlyPromo />;
    }

    // TODO: murder the fullscreen app logic, there must be a better way
    // i don't like how it's not clear which layout is used
    // and that the prerequisite screen is handled multiple times
    const FullscreenApp = getFullscreenApp(router.route);
    if (FullscreenApp !== undefined) {
        return <FullscreenApp />;
    }

    if (router.route?.isForegroundApp) {
        return <SuiteLayout>{children}</SuiteLayout>;
    }

    // display prerequisite for regular application as page view
    // Fullscreen Apps should handle prerequisites by themselves!!!
    if (prerequisite) {
        return (
            <WelcomeLayout>
                <PrerequisitesGuide allowSwitchDevice />
            </WelcomeLayout>
        );
    }

    // route does not exist, display error page in fullscreen mode
    // because if it is handled by Router it is wrapped in SuiteLayout
    if (!router.route) {
        return <ErrorPage />;
    }

    // if a device is not connected or initialized
    if (isLoggedOut) {
        return <LoggedOutLayout>{children}</LoggedOutLayout>;
    }

    // everything is set.
    return <SuiteLayout>{children}</SuiteLayout>;
};
