// This file is a wrapper for @trezor/connect imports in @trezor/suite.
// It could be eventually moved to trezor-connect/plugins.
// import is replaced by webpack config. (see @trezor/suite-build/configs/desktop.webpack.config)
// local imports and exports are intentionally set to /lib directory otherwise webpack NormalModuleReplacementPlugin would replace this line as well.

import { createIpcProxy } from '@trezor/ipc-proxy';
import TrezorConnect from '@trezor/connect/lib/index-browser';

export * from '@trezor/connect/lib/exports';

// override each method of @trezor/connect
// use ipcRenderer message instead of iframe.postMessage (see ./src-electron/modules/trezor-connect-preloader)
type TC = typeof TrezorConnect;
const proxy = createIpcProxy<TC>('TrezorConnect');
(Object.keys(TrezorConnect) as (keyof TC)[]).forEach(method => {
    // @ts-expect-error
    TrezorConnect[method] = proxy[method];
});

export default TrezorConnect;
