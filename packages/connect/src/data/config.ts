// origin: https://github.com/trezor/connect/blob/develop/src/data/config.json

import { TREZOR_USB_DESCRIPTORS } from '@trezor/transport/src/constants';

export const config = {
    webusb: TREZOR_USB_DESCRIPTORS,
    whitelist: [
        { origin: 'chrome-extension://imloifkgjagghnncjkhggdhalmcnfklk', priority: 1 },
        { origin: 'chrome-extension://niebkpllfhmpfbffbfifagfgoamhpflf', priority: 1 },
        { origin: 'file://', priority: 2 },
        { origin: 'trezor.io', priority: 0 },
        { origin: 'sldev.cz', priority: 0 },
        { origin: 'localhost', priority: 0 },
        { origin: 'trezoriovpjcahpzkrewelclulmszwbqpzmzgub37gbcjlvluxtruqad.onion', priority: 0 },
    ],
    management: [{ origin: 'trezor.io' }, { origin: 'sldev.cz' }, { origin: 'localhost' }],
    knownHosts: [
        {
            origin: 'imloifkgjagghnncjkhggdhalmcnfklk',
            label: 'Trezor Password Manager (Develop)',
            icon: '',
        },
        { origin: 'niebkpllfhmpfbffbfifagfgoamhpflf', label: 'Trezor Password Manager', icon: '' },
        {
            origin: 'mnpfhpndmjholfdlhpkjfmjkgppmodaf',
            label: 'MetaMask',
            icon: '',
        },
        {
            origin: 'webextension@metamask.io',
            label: 'MetaMask',
            icon: '',
        },
        {
            origin: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
            label: 'MetaMask',
            icon: '',
        },
        {
            origin: 'bpcdaglidgnlggelgbjfagekoapjmccp',
            label: 'Rainbow DEV',
            icon: '',
        },
        {
            origin: 'opfgelmcmbiajamepnmloijbpoleiama',
            label: 'Rainbow',
            icon: '',
        },
        {
            origin: 'acmacodkjbdgmoleebolmdjonilkdbch',
            label: 'Rabby',
            icon: '',
        },
        {
            origin: 'ehnpnhnhcickeknioaiodjmielfaoajd',
            label: 'Ambire DEV',
            icon: '',
        },
        {
            origin: 'ehgjhhccekdedpbkifaojjaefeohnoea',
            label: 'Ambire',
            icon: '',
        },
        { origin: 'file://', label: ' ', icon: '' },
    ],
    onionDomains: {
        'trezor.io': 'trezoriovpjcahpzkrewelclulmszwbqpzmzgub37gbcjlvluxtruqad.onion',
    },
    supportedFirmware: [
        {
            coin: ['xrp', 'txrp'],
            methods: ['getAccountInfo'],
            min: { T1B1: '0', T2T1: '2.1.0' },
            max: undefined, // NOTE: max field is not used anywhere at the moment, it is here for type compatibility
            comment: [
                "Since firmware 2.1.0 there is a new protobuf field 'destination_tag' in RippleSignTx",
            ],
        },
        {
            coin: ['bnb'],
            min: { T1B1: '1.9.0', T2T1: '2.3.0' },
            comment: [
                'There were protobuf backwards incompatible changes with introduction of 1.9.0/2.3.0 firmwares',
            ],
        },
        {
            coin: ['eth', 'tsep', 'thol'],
            min: { T1B1: '1.8.0', T2T1: '2.1.0' },
            comment: ['There were protobuf backwards incompatible changes.'],
        },
        {
            coin: ['ada', 'tada'],
            min: { T1B1: '0', T2T1: '2.4.3' },
            comment: ['Since 2.4.3 there is initialize.derive_cardano message'],
        },
        {
            methods: ['rippleGetAddress', 'rippleSignTransaction'],
            min: { T1B1: '0', T2T1: '2.1.0' },
            comment: [
                "Since firmware 2.1.0 there is a new protobuf field 'destination_tag' in RippleSignTx",
            ],
        },
        {
            methods: ['cardanoGetAddress', 'cardanoGetPublicKey'],
            min: { T1B1: '0', T2T1: '2.4.3' },
            comment: ['Since 2.4.3 Cardano derivation behavior has changed'],
        },
        {
            methods: ['cardanoSignTransaction'],
            min: { T1B1: '0', T2T1: '2.6.0' },
            comment: ['Before 2.6.0 not all Cardano transactions were supported'],
        },
        {
            methods: ['cardanoGetNativeScriptHash'],
            min: { T1B1: '0', T2T1: '2.4.3' },
            comment: ['Since 2.4.3 Cardano derivation behavior has changed'],
        },
        {
            methods: ['tezosSignTransaction'],
            min: { T1B1: '0', T2T1: '2.1.8' },
            comment: [
                'Since 2.1.8 there are new protobuf fields in tezos transaction (Babylon fork)',
            ],
        },
        {
            methods: ['stellarSignTransaction'],
            min: { T1B1: '1.9.0', T2T1: '2.3.0' },
            comment: [
                'There were protobuf backwards incompatible changes with introduction of 1.9.0/2.3.0 firmwares',
            ],
        },
        {
            capabilities: ['replaceTransaction', 'amountUnit'],
            min: { T1B1: '1.9.4', T2T1: '2.3.5' },
            comment: ['new sign tx process since 1.9.4/2.3.5'],
        },
        {
            capabilities: ['decreaseOutput'],
            min: { T1B1: '1.10.0', T2T1: '2.4.0' },
            comment: ['allow reduce output in RBF transaction since 1.10.0/2.4.0'],
        },
        {
            capabilities: ['eip1559'],
            min: { T1B1: '1.10.4', T2T1: '2.4.2' },
            comment: ['new eth transaction pricing mechanism (EIP1559) since 1.10.4/2.4.2'],
        },
        {
            capabilities: ['taproot', 'signMessageNoScriptType'],
            min: { T1B1: '1.10.4', T2T1: '2.4.3' },
            comment: [
                'new btc accounts taproot since 1.10.4/2.4.3 (BTC + TEST only)',
                'SignMessage with no_script_type support',
            ],
        },
        {
            coin: ['dcr', 'tdcr'],
            methods: ['signTransaction'],
            min: { T1B1: '1.10.1', T2T1: '2.4.0' },
            comment: [''],
        },
        {
            methods: ['ethereumSignTypedData'],
            min: { T1B1: '1.10.5', T2T1: '2.4.3' },
            comment: ['EIP-712 typed signing support added in 1.10.5/2.4.3'],
        },
        {
            capabilities: ['eip712-domain-only'],
            min: { T1B1: '1.10.6', T2T1: '2.4.4' },
            comment: ['EIP-712 domain-only signing, when primaryType=EIP712Domain'],
        },
        {
            capabilities: ['coinjoin'],
            methods: [
                'authorizeCoinjoin',
                'cancelCoinjoinAuthorization',
                'getOwnershipId',
                'getOwnershipProof',
                'setBusy',
                'unlockPath',
            ],
            min: { T1B1: '1.12.1', T2T1: '2.5.3' },
        },
        {
            methods: ['showDeviceTutorial', 'authenticateDevice'],
            min: {
                T1B1: '0',
                T2T1: '0',
                T3T1: '2.8.0',
            },
        },
        {
            methods: ['rebootToBootloader'],
            min: { T1B1: '1.10.0', T2T1: '2.6.0' },
        },
        {
            methods: ['getFirmwareHash'],
            min: { T1B1: '1.11.1', T2T1: '2.5.1' },
        },
        {
            methods: ['solanaGetPublicKey', 'solanaGetAddress', 'solanaSignTransaction'],
            min: {
                T1B1: '0',
                T2T1: '2.6.4',
                T2B1: '2.6.4',
            },
        },
        {
            capabilities: ['chunkify'],
            min: {
                T1B1: '0',
                T2T1: '2.6.3',
                T2B1: '2.6.3',
            },
            comment: [
                "Since firmware 2.6.3 there is a new protobuf field 'chunkify' in almost all getAddress and signTx methods",
            ],
        },
        {
            methods: ['changeLanguage'],
            min: {
                T1B1: '0',
                T2T1: '2.7.0',
                T2B1: '2.7.0',
            },
        },
    ],
};
