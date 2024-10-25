import TrezorConnect from '@trezor/connect';

/**
 * Please note, that this example needs:
 * - Trezor bridge running
 * - Device connected to USB
 */
const runExample = async () => {
    await TrezorConnect.init({
        manifest: {
            appUrl: 'my app',
            email: 'app@myapp.meow',
        },
    });

    // // this event will be fired when bridge starts or stops or there is no bridge running
    // TrezorConnect.on(TRANSPORT_EVENT, (event: any) => {
    //     console.log(event);
    // });

    // // this event will be fired when device connects, disconnects or changes
    // TrezorConnect.on(DEVICE_EVENT, (event: any) => {
    //     console.log(event);
    // });

    const result = await TrezorConnect.loadDevice({
        // mnemonics: 'all all all all all all all all all all all all',
        mnemonics: ['all all all all all all all all all all all all'],
        // mnemonics: [
        //     'all',
        //     'all',
        //     'all',
        //     'all',
        //     'all',
        //     'all',
        //     'all',
        //     'all',
        //     'all',
        //     'all',
        //     'all',
        //     'all',
        // ],
    });

    console.log(result);

    if (!result.success) {
        process.exit(1);
    } else {
        process.exit(0);
    }
};

runExample();
