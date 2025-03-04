// original file https://github.com/trezor/connect/blob/develop/src/js/device/Device.js
import { randomBytes } from 'crypto';

import {
    versionUtils,
    createDeferred,
    Deferred,
    TypedEmitter,
    createTimeoutPromise,
    isArrayMember,
} from '@trezor/utils';
import { Session } from '@trezor/transport';
import { TransportProtocol, v1 as v1Protocol } from '@trezor/protocol';
import { type Transport, type Descriptor, TRANSPORT_ERROR } from '@trezor/transport';

import { DeviceCommands } from './DeviceCommands';
import { PROTO, ERRORS, FIRMWARE } from '../constants';
import {
    DEVICE,
    DeviceButtonRequestPayload,
    UI,
    UiResponsePin,
    UiResponsePassphrase,
    UiResponseWord,
} from '../events';
import { getAllNetworks } from '../data/coinInfo';
import { DataManager } from '../data/DataManager';
import { getFirmwareStatus, getRelease, getReleases } from '../data/firmwareInfo';
import {
    parseCapabilities,
    getUnavailableCapabilities,
    parseRevision,
    ensureInternalModelFeature,
} from '../utils/deviceFeaturesUtils';
import { initLog } from '../utils/debug';
import {
    Device as DeviceTyped,
    DeviceFirmwareStatus,
    DeviceStatus,
    DeviceState,
    Features,
    ReleaseInfo,
    UnavailableCapabilities,
    FirmwareType,
    VersionArray,
    KnownDevice,
    StaticSessionId,
    FirmwareHashCheckResult,
    FirmwareHashCheckError,
    DeviceUniquePath,
} from '../types';
import { models } from '../data/models';
import { getLanguage } from '../data/getLanguage';
import { checkFirmwareRevision } from './checkFirmwareRevision';
import { IStateStorage } from './StateStorage';
import type { PromptCallback } from './prompts';
import { calculateFirmwareHash, getBinaryOptional, stripFwHeaders } from '../api/firmware';

// custom log
const _log = initLog('Device');

export type RunOptions = {
    // skipFinalReload - normally, after action, features are reloaded again
    //                   because some actions modify the features
    //                   but sometimes, you don't need that and can skip that
    skipFinalReload?: boolean;
    // waiting - if waiting and someone else holds the session, it waits until it's free
    //          and if it fails on acquire (because of more tabs acquiring simultaneously),
    //          it tries repeatedly
    waiting?: boolean;
    onlyOneActivity?: boolean;

    // cancel popup request when we are sure that there is no need to authenticate
    // Method gets called after run() fetch new Features but before trezor-link dispatch "acquire" event
    cancelPopupRequest?: () => any;

    keepSession?: boolean;
    useCardanoDerivation?: boolean;
};

export const GET_FEATURES_TIMEOUT = 3_000;
// Due to performance issues in suite-native during app start, original timeout is not sufficient.
export const GET_FEATURES_TIMEOUT_REACT_NATIVE = 20_000;

const parseRunOptions = (options?: RunOptions): RunOptions => {
    if (!options) options = {};

    return options;
};

export interface DeviceEvents {
    [DEVICE.PIN]: (
        device: Device,
        type: PROTO.PinMatrixRequestType | undefined,
        callback: PromptCallback<UiResponsePin['payload']>,
    ) => void;
    [DEVICE.WORD]: (
        device: Device,
        type: PROTO.WordRequestType,
        callback: PromptCallback<UiResponseWord['payload']>,
    ) => void;
    [DEVICE.PASSPHRASE]: (
        device: Device,
        callback: PromptCallback<UiResponsePassphrase['payload']>,
    ) => void;
    [DEVICE.PASSPHRASE_ON_DEVICE]: () => void;
    [DEVICE.BUTTON]: (device: Device, payload: DeviceButtonRequestPayload) => void;
}

type DeviceLifecycle =
    | typeof DEVICE.CONNECT
    | typeof DEVICE.CONNECT_UNACQUIRED
    | typeof DEVICE.DISCONNECT
    | typeof DEVICE.CHANGED;

type DeviceLifecycleListener = (lifecycle: DeviceLifecycle) => void;

type DeviceParams = {
    id: DeviceUniquePath;
    transport: Transport;
    descriptor: Descriptor;
    listener: DeviceLifecycleListener;
};

/**
 * @export
 * @class Device
 * @extends {EventEmitter}
 */
export class Device extends TypedEmitter<DeviceEvents> {
    public readonly transport: Transport;
    public readonly protocol: TransportProtocol;
    private readonly transportPath;
    private readonly transportSessionOwner;
    private readonly transportDescriptorType;
    private session;
    private lastAcquiredHere;

    /**
     * descriptor was detected on transport layer but sending any messages (such as GetFeatures) to it failed either
     * with some expected error, for example HID device, LIBUSB_ERROR, or it simply timeout out. such device can't be worked
     * with and user needs to take some action. for example reconnect the device, update firmware or change transport type
     */
    private unreadableError?: string;

    // @ts-expect-error: strictPropertyInitialization
    private _firmwareStatus: DeviceFirmwareStatus;
    public get firmwareStatus() {
        return this._firmwareStatus;
    }

    private _firmwareRelease?: ReleaseInfo | null;
    public get firmwareRelease() {
        return this._firmwareRelease;
    }

    // @ts-expect-error: strictPropertyInitialization
    private _features: Features;
    public get features() {
        return this._features;
    }

    private _featuresNeedsReload = false;

    // variables used in one workflow: acquire -> transportSession -> commands -> run -> keepTransportSession -> release
    private acquirePromise?: ReturnType<Transport['acquire']>;
    private releasePromise?: ReturnType<Transport['release']>;
    private runPromise?: Deferred<void>;

    private keepTransportSession = false;
    public commands?: DeviceCommands;
    private cancelableAction?: (err?: Error) => Promise<unknown>;

    private loaded = false;

    private inconsistent = false;

    private firstRunPromise: Deferred<boolean>;
    private instance = 0;

    // DeviceState list [this.instance]: DeviceState | undefined
    private state: DeviceState[] = [];
    private stateStorage?: IStateStorage = undefined;

    private _unavailableCapabilities: UnavailableCapabilities = {};
    public get unavailableCapabilities(): Readonly<UnavailableCapabilities> {
        return this._unavailableCapabilities;
    }

    private _firmwareType?: FirmwareType;
    public get firmwareType() {
        return this._firmwareType;
    }

    private name = 'Trezor';

    private color?: string;

    private availableTranslations: string[] = [];

    private authenticityChecks: NonNullable<KnownDevice['authenticityChecks']> = {
        firmwareRevision: null,
        firmwareHash: null,
    };

    private readonly uniquePath;

    private readonly emitLifecycle;

    private sessionDfd?: Deferred<Session | null>;

    constructor({ id, transport, descriptor, listener }: DeviceParams) {
        super();

        this.emitLifecycle = listener;
        this.protocol = v1Protocol;

        // === immutable properties
        this.uniquePath = id;
        this.transport = transport;
        this.transportPath = descriptor.path;
        this.transportSessionOwner = descriptor.sessionOwner;
        this.transportDescriptorType = descriptor.type;

        this.session = descriptor.session;
        this.lastAcquiredHere = false;

        // this will be released after first run
        this.firstRunPromise = createDeferred();
    }

    private getSessionChangePromise() {
        if (!this.sessionDfd) {
            this.sessionDfd = createDeferred<Session | null>();
            this.sessionDfd.promise.finally(() => {
                this.sessionDfd = undefined;
            });
        }

        return this.sessionDfd.promise;
    }

    private async waitAndCompareSession<
        T extends { success: true; payload: Session | null } | { success: false },
    >(response: T, sessionPromise: Promise<Session | null>) {
        if (response.success) {
            try {
                if ((await sessionPromise) !== response.payload) {
                    return {
                        success: false,
                        error: TRANSPORT_ERROR.SESSION_WRONG_PREVIOUS,
                    } as const;
                }
            } catch {
                return {
                    success: false,
                    error: TRANSPORT_ERROR.DEVICE_DISCONNECTED_DURING_ACTION,
                } as const;
            }
        }

        return response;
    }

    acquire() {
        const sessionPromise = this.getSessionChangePromise();

        this.acquirePromise = this.transport
            .acquire({ input: { path: this.transportPath, previous: this.session } })
            .then(result => this.waitAndCompareSession(result, sessionPromise))
            .then(result => {
                if (result.success) {
                    this.session = result.payload;
                    this.lastAcquiredHere = true;

                    this.commands?.dispose();
                    this.commands = new DeviceCommands(this, this.transport, this.session);

                    return result;
                } else {
                    if (this.runPromise) {
                        this.runPromise.reject(new Error(result.error));
                        delete this.runPromise;
                    }
                    throw result.error;
                }
            })
            .finally(() => {
                this.acquirePromise = undefined;
            });

        return this.acquirePromise;
    }

    async release() {
        const localSession = this.getLocalSession();
        if (!localSession || this.keepTransportSession || this.releasePromise) {
            return;
        }

        if (this.commands) {
            this.commands.dispose();
            if (this.commands.callPromise) {
                await this.commands.callPromise;
            }
        }

        const sessionPromise = this.getSessionChangePromise();

        this.releasePromise = this.transport
            .release({ session: localSession, path: this.transportPath })
            .then(result => this.waitAndCompareSession(result, sessionPromise))
            .then(result => {
                if (result.success) {
                    this.session = null;
                }

                return result;
            })
            .finally(() => {
                this.releasePromise = undefined;
            });

        return this.releasePromise;
    }

    releaseTransportSession() {
        this.keepTransportSession = false;
    }

    async cleanup(release = true) {
        // remove all listeners
        this.eventNames().forEach(e => this.removeAllListeners(e as keyof DeviceEvents));

        // make sure that Device_CallInProgress will not be thrown
        delete this.runPromise;
        if (release) {
            await this.release();
        }
    }

    // call only once, right after device creation
    async handshake(delay?: number) {
        if (delay) {
            await createTimeoutPromise(501 + delay);
        }

        while (true) {
            if (this.isUsedElsewhere()) {
                this.emitLifecycle(DEVICE.CONNECT_UNACQUIRED);
            } else {
                try {
                    await this.run();
                } catch (error) {
                    _log.warn(`device.run error.message: ${error.message}, code: ${error.code}`);

                    if (
                        error.code === 'Device_NotFound' ||
                        error.message === TRANSPORT_ERROR.DEVICE_NOT_FOUND ||
                        error.message === TRANSPORT_ERROR.DEVICE_DISCONNECTED_DURING_ACTION ||
                        error.message === TRANSPORT_ERROR.DESCRIPTOR_NOT_FOUND ||
                        error.message === TRANSPORT_ERROR.HTTP_ERROR // bridge died during device initialization
                    ) {
                        // disconnected, do nothing
                    } else if (
                        // we don't know what really happened
                        error.message === TRANSPORT_ERROR.UNEXPECTED_ERROR ||
                        // someone else took the device at the same time
                        error.message === TRANSPORT_ERROR.SESSION_WRONG_PREVIOUS ||
                        // device had some session when first seen -> we do not read it so that we don't interrupt somebody else's flow
                        error.code === 'Device_UsedElsewhere' ||
                        // TODO: is this needed? can't I just use transport error?
                        error.code === 'Device_InitializeFailed'
                    ) {
                        this.emitLifecycle(DEVICE.CONNECT_UNACQUIRED);
                    } else if (
                        // device was claimed by another application on transport api layer (claimInterface in usb nomenclature) but never released (releaseInterface in usb nomenclature)
                        // the only remedy for this is to reconnect device manually
                        error.message === TRANSPORT_ERROR.INTERFACE_UNABLE_TO_OPEN_DEVICE ||
                        // catch one of trezord LIBUSB_ERRORs
                        error.message?.indexOf(ERRORS.LIBUSB_ERROR_MESSAGE) >= 0
                    ) {
                        this.unreadableError = error?.message;
                        this.emitLifecycle(DEVICE.CONNECT_UNACQUIRED);
                    } else {
                        await createTimeoutPromise(501);
                        continue;
                    }
                }
            }

            return;
        }
    }

    async updateDescriptor(descriptor: Descriptor) {
        this.sessionDfd?.resolve(descriptor.session);

        await Promise.all([this.acquirePromise, this.releasePromise]);

        // TODO improve these conditions

        // Session changed to different than the current one
        // -> acquired by someone else
        if (descriptor.session && descriptor.session !== this.session) {
            this.usedElsewhere();
        }

        // Session changed to null
        // -> released
        if (!descriptor.session) {
            const methodStillRunning = !this.commands?.isDisposed();
            if (methodStillRunning) {
                this.releaseTransportSession();
            }
        }

        this.session = descriptor.session;
        this.emitLifecycle(DEVICE.CHANGED);
    }

    // TODO empty fn variant can be split/removed
    run(fn?: () => Promise<void>, options?: RunOptions) {
        if (this.runPromise) {
            _log.warn('Previous call is still running');
            throw ERRORS.TypedError('Device_CallInProgress');
        }

        options = parseRunOptions(options);

        const wasUnacquired = this.isUnacquired();
        const runPromise = createDeferred();
        this.runPromise = runPromise;

        this._runInner(fn, options)
            .then(() => {
                if (wasUnacquired && !this.isUnacquired()) {
                    this.emitLifecycle(DEVICE.CONNECT);
                }
            })
            .catch(err => {
                runPromise.reject(err);
            });

        return runPromise.promise;
    }

    async override(error: Error) {
        if (this.acquirePromise) {
            await this.acquirePromise;
        }

        if (this.runPromise) {
            await this.interruptionFromUser(error);
        }
        if (this.releasePromise) {
            await this.releasePromise;
        }
    }

    setCancelableAction(callback: NonNullable<typeof this.cancelableAction>) {
        this.cancelableAction = (e?: Error) =>
            callback(e)
                .catch(e2 => {
                    _log.debug('cancelableAction error', e2);
                })
                .finally(() => {
                    this.clearCancelableAction();
                });
    }

    clearCancelableAction() {
        this.cancelableAction = undefined;
    }

    async interruptionFromUser(error: Error) {
        _log.debug('interruptionFromUser');

        await this.cancelableAction?.(error);
        await this.commands?.cancel();

        if (this.runPromise) {
            // reject inner defer
            this.runPromise.reject(error);
            delete this.runPromise;
        }
    }

    public usedElsewhere() {
        // only makes sense to continue when device held by this instance
        if (!this.lastAcquiredHere) {
            return;
        }
        this.lastAcquiredHere = false;
        this._featuresNeedsReload = true;

        _log.debug('interruptionFromOutside');

        if (this.commands) {
            this.commands.dispose();
        }
        if (this.runPromise) {
            this.runPromise.reject(ERRORS.TypedError('Device_UsedElsewhere'));
            delete this.runPromise;
        }

        // session was acquired by another instance. but another might not have power to release interface
        // so it only notified about its session acquiral and the interrupted instance should cooperate
        // and release device too.
        if (this.session) {
            this.transport.releaseDevice(this.session);
        }
    }

    private async _runInner<X>(
        fn: (() => Promise<X>) | undefined,
        options: RunOptions,
    ): Promise<void> {
        // typically when using cancel/override, device might be releasing
        // note: I am tempted to do this check at the beginning of device.acquire but on the other hand I would like
        // to have methods as atomic as possible and shift responsibility for deciding when to call them on the caller
        if (this.releasePromise) {
            await this.releasePromise;
        }

        const acquireNeeded = !this.isUsedHere() || this.commands?.disposed;
        if (acquireNeeded) {
            // acquire session
            await this.acquire();
        }

        const { staticSessionId, deriveCardano } = this.getState() || {};
        if (acquireNeeded || !staticSessionId || (!deriveCardano && options.useCardanoDerivation)) {
            // update features
            try {
                if (fn) {
                    await this.initialize(!!options.useCardanoDerivation);
                } else {
                    const getFeaturesTimeout =
                        DataManager.getSettings('env') === 'react-native'
                            ? GET_FEATURES_TIMEOUT_REACT_NATIVE
                            : GET_FEATURES_TIMEOUT;

                    // do not initialize while firstRunPromise otherwise `features.session_id` could be affected
                    await Promise.race([
                        this.getFeatures(),
                        // note: tested on 24.7.2024 and whatever is written below this line is still valid
                        // We do not support T1B1 <1.9.0 but we still need Features even from not supported devices to determine your version
                        // and tell you that update is required.
                        // Edge-case: T1B1 + bootloader < 1.4.0 doesn't know the "GetFeatures" message yet and it will send no response to its
                        // transport response is pending endlessly, calling any other message will end up with "device call in progress"
                        // set the timeout for this call so whenever it happens "unacquired device" will be created instead
                        // next time device should be called together with "Initialize" (calling "acquireDevice" from the UI)
                        new Promise((_resolve, reject) =>
                            setTimeout(
                                () => reject(new Error('GetFeatures timeout')),
                                getFeaturesTimeout,
                            ),
                        ),
                    ]);
                }
            } catch (error) {
                _log.warn('Device._runInner error: ', error.message);
                if (
                    !this.inconsistent &&
                    (error.message === 'GetFeatures timeout' || error.message === 'Unknown message')
                ) {
                    // handling corner-case T1B1 + bootloader < 1.4.0 (above)
                    // if GetFeatures fails try again
                    // this time add empty "fn" param to force Initialize message
                    this.inconsistent = true;

                    return this._runInner(() => Promise.resolve({}), options);
                }

                if (TRANSPORT_ERROR.ABORTED_BY_TIMEOUT === error.message) {
                    this.unreadableError = 'Connection timeout';
                }

                this.inconsistent = true;
                delete this.runPromise;

                return Promise.reject(
                    ERRORS.TypedError(
                        'Device_InitializeFailed',
                        `Initialize failed: ${error.message}${
                            error.code ? `, code: ${error.code}` : ''
                        }`,
                    ),
                );
            }
        }

        await this.checkFirmwareHashWithRetries();
        await this.checkFirmwareRevisionWithRetries();

        if (
            this.features?.language &&
            !this.features.language_version_matches &&
            this.atLeast('2.7.0')
        ) {
            _log.info('language version mismatch. silently updating...');

            try {
                await this.changeLanguage({ language: this.features.language });
            } catch (err) {
                _log.error('change language failed silently', err);
            }
        }

        // if keepSession is set do not release device
        // until method with keepSession: false will be called
        if (options.keepSession) {
            this.keepTransportSession = true;
        }

        // call inner function
        if (fn) {
            await fn();
        }

        // reload features
        if (this.loaded && this.features && !options.skipFinalReload) {
            await this.getFeatures();
        }

        if (
            (!this.keepTransportSession && typeof options.keepSession !== 'boolean') ||
            options.keepSession === false
        ) {
            this.keepTransportSession = false;
            await this.release();
        }

        if (this.runPromise) {
            this.runPromise.resolve();
        }

        delete this.runPromise;

        if (!this.loaded) {
            this.loaded = true;
            this.firstRunPromise.resolve(true);
        }
    }

    getCommands() {
        if (!this.commands) {
            throw ERRORS.TypedError('Runtime', `Device: commands not defined`);
        }

        return this.commands;
    }

    setInstance(instance = 0) {
        if (this.instance !== instance) {
            // if requested instance is different than current
            // and device wasn't released in previous call (example: interrupted discovery which set "keepSession" to true but never released)
            // clear "keepTransportSession" and reset "transportSession" to ensure that "initialize" will be called
            if (this.keepTransportSession) {
                this.lastAcquiredHere = false;
                this.keepTransportSession = false;
            }
        }
        this.instance = instance;
    }

    getInstance() {
        return this.instance;
    }

    getState(): DeviceState | undefined {
        return this.state[this.instance];
    }

    setState(state?: Partial<DeviceState>) {
        if (!state) {
            delete this.state[this.instance];
        } else {
            const prevState = this.state[this.instance];
            const newState = {
                ...prevState,
                ...state,
            };

            this.state[this.instance] = newState;
            this.stateStorage?.saveState(this, newState);
        }
    }

    async validateState(preauthorized = false) {
        if (!this.features) return;

        if (!this.features.unlocked && preauthorized) {
            // NOTE: auto locked device accepts preauthorized methods (authorizeConjoin, getOwnershipProof, signTransaction) without pin request.
            // in that case it's enough to check if session_id is preauthorized...
            if (await this.getCommands().preauthorize(false)) {
                return;
            }
            // ...and if it's not then unlock device and proceed to regular GetAddress flow
        }

        const expectedState = this.getState()?.staticSessionId;
        const state = await this.getCommands().getDeviceState();
        const uniqueState: StaticSessionId = `${state}@${this.features.device_id}:${this.instance}`;
        if (this.features.session_id) {
            this.setState({ sessionId: this.features.session_id });
        }
        if (expectedState && expectedState !== uniqueState) {
            return uniqueState;
        }
        if (!expectedState) {
            this.setState({ staticSessionId: uniqueState });
        }
    }

    async initialize(useCardanoDerivation: boolean) {
        let payload: PROTO.Initialize | undefined;
        if (this.features) {
            const { sessionId, deriveCardano } = this.getState() || {};
            // If the user has BIP-39 seed, and Initialize(derive_cardano=True) is not sent,
            // all Cardano calls will fail because the root secret will not be available.
            payload = {
                derive_cardano: deriveCardano || useCardanoDerivation,
            };
            if (sessionId) {
                payload.session_id = sessionId;
            }
        }

        const { message } = await this.getCommands().typedCall('Initialize', 'Features', payload);
        this._updateFeatures(message);
        this.setState({ deriveCardano: payload?.derive_cardano });
    }

    initStorage(storage: IStateStorage) {
        this.stateStorage = storage;
        this.setState(storage.loadState(this));
    }

    async getFeatures() {
        // Please keep the method simple - don't add any async logic
        const { message } = await this.getCommands().typedCall('GetFeatures', 'Features', {});
        this._updateFeatures(message);
    }

    private async checkFirmwareHashWithRetries() {
        const lastResult = this.authenticityChecks.firmwareHash;
        const notDoneYet = lastResult === null;
        const attemptsDone = lastResult?.attemptCount ?? 0;
        if (attemptsDone >= FIRMWARE.HASH_CHECK_MAX_ATTEMPTS) return;

        const wasError = lastResult !== null && !lastResult.success;
        const wasErrorRetriable =
            wasError && isArrayMember(lastResult.error, FIRMWARE.HASH_CHECK_RETRIABLE_ERRORS);
        const lastErrorPayload = wasError ? lastResult?.errorPayload : null;

        if (notDoneYet || wasErrorRetriable) {
            const result = await this.checkFirmwareHash();
            this.authenticityChecks.firmwareHash = result;

            if (result === null) return;
            result.attemptCount = attemptsDone + 1;

            // if it suceeeded only after a retry, and there was an `errorPayload` previously, we want to pass that information to suite
            if (result.success && lastErrorPayload) {
                result.warningPayload = { lastErrorPayload, successOnAttempt: result.attemptCount };
            }
        }
    }

    private async checkFirmwareHash(): Promise<FirmwareHashCheckResult | null> {
        const createFailResult = (error: FirmwareHashCheckError, errorPayload?: unknown) => ({
            success: false,
            error,
            errorPayload,
        });

        const baseUrl = DataManager.getSettings('binFilesBaseUrl');
        const enabled = DataManager.getSettings('enableFirmwareHashCheck');
        if (!enabled || baseUrl === undefined) return createFailResult('check-skipped');

        const firmwareVersion = this.getVersion();
        // device has no features (not yet connected) or no firmware
        if (firmwareVersion === undefined || !this.features || this.features.bootloader_mode) {
            return null;
        }

        const checkSupported = this.atLeast(FIRMWARE.FW_HASH_SUPPORTED_VERSIONS);
        if (!checkSupported) return createFailResult('check-unsupported');

        const release = getReleases(this.features.internal_model).find(r =>
            versionUtils.isEqual(r.version, firmwareVersion),
        );
        // if version is expected to support hash check, but the release is unknown, then firmware is considered unofficial
        if (release === undefined) return createFailResult('unknown-release');

        const btcOnly = this.firmwareType === FirmwareType.BitcoinOnly;
        const binary = await getBinaryOptional({ baseUrl, btcOnly, release });
        // release was found, but not its binary - happens on desktop, where only local files are searched
        if (binary === null) {
            return createFailResult('check-unsupported');
        }
        // binary was found, but it's likely a git LFS pointer (can happen on dev) - see onCallFirmwareUpdate.ts
        if (binary.byteLength < 200) {
            _log.warn(`Firmware binary for hash check suspiciously small (< 200 b)`);

            return createFailResult('check-unsupported');
        }

        const strippedBinary = stripFwHeaders(binary);
        const { hash: expectedHash, challenge } = calculateFirmwareHash(
            this.features.major_version,
            strippedBinary,
            randomBytes(32),
        );

        // handle rejection of call by a counterfeit device. If unhandled, it crashes device initialization,
        // so device can't be used, but it's preferable to display proper message about counterfeit device
        try {
            const deviceResponse = await this.getCommands().typedCall(
                'GetFirmwareHash',
                'FirmwareHash',
                { challenge },
            );
            if (!deviceResponse?.message?.hash) {
                return createFailResult('other-error', 'Device response is missing hash');
            }

            if (deviceResponse.message.hash !== expectedHash) {
                return createFailResult('hash-mismatch');
            }

            return { success: true };
        } catch (errorPayload) {
            return createFailResult('other-error', errorPayload);
        }
    }

    private async checkFirmwareRevisionWithRetries() {
        const lastResult = this.authenticityChecks.firmwareRevision;
        const notDoneYet = lastResult === null;

        const wasError = lastResult !== null && !lastResult.success;
        const wasErrorRetriable =
            wasError && isArrayMember(lastResult.error, FIRMWARE.REVISION_CHECK_RETRIABLE_ERRORS);

        if (notDoneYet || wasErrorRetriable) {
            await this.checkFirmwareRevision();
        }
    }

    private async checkFirmwareRevision() {
        const firmwareVersion = this.getVersion();

        if (!firmwareVersion || !this.features) {
            return; // This happens when device has no features (not yet connected)
        }

        if (this.features.bootloader_mode === true) {
            return;
        }

        const releases = getReleases(this.features.internal_model);

        const release = releases.find(
            r =>
                firmwareVersion &&
                versionUtils.isVersionArray(firmwareVersion) &&
                versionUtils.isEqual(r.version, firmwareVersion),
        );

        this.authenticityChecks.firmwareRevision = await checkFirmwareRevision({
            internalModel: this.features.internal_model,
            deviceRevision: this.features.revision,
            firmwareVersion,
            expectedRevision: release?.firmware_revision,
        });
    }

    async changeLanguage({
        language,
        binary,
    }: { language?: undefined; binary: ArrayBuffer } | { language: string; binary?: undefined }) {
        if (language === 'en-US') {
            return this._uploadTranslationData(null);
        }

        if (binary) {
            return this._uploadTranslationData(binary);
        }

        const version = this.getVersion();
        if (!version) {
            throw ERRORS.TypedError('Runtime', 'changeLanguage: device version unknown');
        }

        const downloadedBinary = await getLanguage({
            language,
            version,
            internal_model: this.features.internal_model,
        });

        if (!downloadedBinary) {
            throw ERRORS.TypedError('Runtime', 'changeLanguage: translation not found');
        }

        return this._uploadTranslationData(downloadedBinary);
    }

    private async _uploadTranslationData(payload: ArrayBuffer | null) {
        if (!this.commands) {
            throw ERRORS.TypedError('Runtime', 'uploadTranslationData: device.commands is not set');
        }

        if (payload === null) {
            const response = await this.commands.typedCall(
                'ChangeLanguage',
                ['Success'],
                { data_length: 0 }, // For en-US where we just send `ChangeLanguage(size=0)`
            );

            return response.message;
        }

        const length = payload.byteLength;

        let response = await this.commands.typedCall(
            'ChangeLanguage',
            ['TranslationDataRequest', 'Success'],
            { data_length: length },
        );

        while (response.type !== 'Success') {
            const start = response.message.data_offset!;
            const end = response.message.data_offset! + response.message.data_length!;
            const chunk = payload.slice(start, end);

            response = await this.commands.typedCall(
                'TranslationDataAck',
                ['TranslationDataRequest', 'Success'],
                {
                    data_chunk: Buffer.from(chunk).toString('hex'),
                },
            );
        }

        return response.message;
    }

    private _updateFeatures(feat: Features) {
        const capabilities = parseCapabilities(feat);
        feat.capabilities = capabilities;
        // GetFeatures doesn't return 'session_id'
        if (this.features && this.features.session_id && !feat.session_id) {
            feat.session_id = this.features.session_id;
        }
        feat.unlocked = feat.unlocked ?? true;
        // fix inconsistency of revision attribute between T1B1 and old T2T1 fw
        const revision = parseRevision(feat);
        feat.revision = revision;

        // Fix missing model and internal_model in older fw, model has to be fixed first
        // 1. - old T1B1 is missing features.model
        if (!feat.model && feat.major_version === 1) {
            feat.model = '1';
        }
        // 2. - old fw does not include internal_model. T1B1 does not report it yet, T2T1 starts in 2.6.0
        if (!feat.internal_model) {
            feat.internal_model = ensureInternalModelFeature(feat.model);
        }

        const version = this.getVersion();
        const newVersion = [
            feat.major_version,
            feat.minor_version,
            feat.patch_version,
        ] satisfies VersionArray;

        // check if FW version or capabilities did change
        if (!version || !versionUtils.isEqual(version, newVersion)) {
            this._unavailableCapabilities = getUnavailableCapabilities(feat, getAllNetworks());
            this._firmwareStatus = getFirmwareStatus(feat);
            this._firmwareRelease = getRelease(feat);

            this.availableTranslations = this.firmwareRelease?.translations ?? [];
        }

        this._features = feat;
        this._featuresNeedsReload = false;

        // Vendor headers have been changed in 2.6.3.
        if (feat.fw_vendor === 'Trezor Bitcoin-only') {
            this._firmwareType = FirmwareType.BitcoinOnly;
        } else if (feat.fw_vendor === 'Trezor') {
            this._firmwareType = FirmwareType.Regular;
        } else if (this.getMode() !== 'bootloader') {
            // Relevant for T1B1, T2T1 and custom firmware with a different vendor header. Capabilities do not work in bootloader mode.
            this._firmwareType =
                feat.capabilities &&
                feat.capabilities.length > 0 &&
                !feat.capabilities.includes('Capability_Bitcoin_like')
                    ? FirmwareType.BitcoinOnly
                    : FirmwareType.Regular;
        }

        const deviceInfo = models[feat.internal_model] ?? {
            name: `Unknown ${feat.internal_model}`,
            colors: {},
        };

        this.name = deviceInfo.name;

        // todo: move to 553
        if (feat?.unit_color) {
            const deviceUnitColor = feat.unit_color.toString();

            if (deviceUnitColor in deviceInfo.colors) {
                this.color = (deviceInfo.colors as Record<string, string>)[deviceUnitColor];
            }
        }
    }

    isUnacquired() {
        return this.features === undefined;
    }

    isUnreadable() {
        return !!this.unreadableError;
    }

    disconnect() {
        // TODO: cleanup everything
        _log.debug('Disconnect cleanup');

        this.sessionDfd?.reject(new Error());

        this.lastAcquiredHere = false; // set to null to prevent transport.release and cancelableAction

        this.emitLifecycle(DEVICE.DISCONNECT);

        return this.interruptionFromUser(ERRORS.TypedError('Device_Disconnected'));
    }

    isBootloader() {
        return this.features && !!this.features.bootloader_mode;
    }

    isInitialized() {
        return this.features && !!this.features.initialized;
    }

    isSeedless() {
        return this.features && !!this.features.no_backup;
    }

    isInconsistent() {
        return this.inconsistent;
    }

    getVersion(): VersionArray | undefined {
        if (!this.features) return;

        return [
            this.features.major_version,
            this.features.minor_version,
            this.features.patch_version,
        ];
    }

    atLeast(versions: string[] | string) {
        const version = this.getVersion();
        if (!this.features || !version) return false;
        const modelVersion =
            typeof versions === 'string' ? versions : versions[this.features.major_version - 1];

        return versionUtils.isNewerOrEqual(version, modelVersion);
    }

    isUsed() {
        return typeof this.session === 'string';
    }

    isUsedHere() {
        return this.isUsed() && this.lastAcquiredHere;
    }

    isUsedElsewhere() {
        return this.isUsed() && !this.lastAcquiredHere;
    }

    isRunning() {
        return !!this.runPromise;
    }

    isLoaded() {
        return this.loaded;
    }

    waitForFirstRun() {
        return this.firstRunPromise.promise;
    }

    getLocalSession() {
        return this.lastAcquiredHere ? this.session : null;
    }

    getUniquePath() {
        return this.uniquePath;
    }

    isT1() {
        return this.features ? this.features.major_version === 1 : false;
    }

    hasUnexpectedMode(allow: string[], require: string[]) {
        // both allow and require cases might generate single unexpected mode
        if (this.features) {
            // allow cases
            if (this.isBootloader() && !allow.includes(UI.BOOTLOADER)) {
                return UI.BOOTLOADER;
            }
            if (!this.isInitialized() && !allow.includes(UI.INITIALIZE)) {
                return UI.INITIALIZE;
            }
            if (this.isSeedless() && !allow.includes(UI.SEEDLESS)) {
                return UI.SEEDLESS;
            }

            // require cases
            if (!this.isBootloader() && require.includes(UI.BOOTLOADER)) {
                return UI.NOT_IN_BOOTLOADER;
            }
        }

        return null;
    }

    async dispose() {
        this.removeAllListeners();
        if (this.session && this.lastAcquiredHere) {
            try {
                await this.cancelableAction?.();
                await this.commands?.cancel();

                return this.transport.release({
                    session: this.session,
                    path: this.transportPath,
                    onClose: true,
                });
            } catch {
                // empty
            }
        }
    }

    private getMode() {
        if (this.features.bootloader_mode) return 'bootloader';
        if (!this.features.initialized) return 'initialize';
        if (this.features.no_backup) return 'seedless';

        return 'normal';
    }

    // simplified object to pass via postMessage
    toMessageObject(): DeviceTyped {
        const { name, uniquePath: path } = this;
        const base = { path, name };

        if (this.unreadableError) {
            return {
                ...base,
                type: 'unreadable',
                error: this.unreadableError, // provide error details
                label: 'Unreadable device',
                transportDescriptorType: this.transportDescriptorType,
            };
        }
        if (this.isUnacquired()) {
            return {
                ...base,
                type: 'unacquired',
                label: 'Unacquired device',
                name: this.name,
                transportSessionOwner: this.transportSessionOwner,
            };
        }
        const defaultLabel = 'My Trezor';
        const label =
            this.features.label === '' || !this.features.label ? defaultLabel : this.features.label;
        let status: DeviceStatus = this.isUsedElsewhere() ? 'occupied' : 'available';
        if (this._featuresNeedsReload) status = 'used';

        return {
            ...base,
            type: 'acquired',
            id: this.features.device_id,
            label,
            _state: this.getState(),
            state: this.getState()?.staticSessionId,
            status,
            mode: this.getMode(),
            color: this.color,
            firmware: this.firmwareStatus,
            firmwareRelease: this.firmwareRelease,
            firmwareType: this.firmwareType,
            features: this.features,
            unavailableCapabilities: this.unavailableCapabilities,
            availableTranslations: this.availableTranslations,
            authenticityChecks: this.authenticityChecks,
        };
    }
}
