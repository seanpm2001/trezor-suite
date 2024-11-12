import { Capability } from '@trezor/protobuf/src/messages-schema';
import { AbstractMethod, Payload } from '../../../core/AbstractMethod';
import { CallMethodPayload } from '../../../events';
import { getFirmwareRange } from '../../common/paramsValidator';
import { getMiscNetwork } from '../../../data/coinInfo';

export abstract class BinanceAbstractMethod<
    Name extends CallMethodPayload['method'],
    Params = undefined,
> extends AbstractMethod<Name, Params> {
    requiredDeviceCapabilities = [Capability.Binance];

    constructor(message: { id?: number; payload: Payload<Name> }) {
        super(message);
        this.firmwareRange = getFirmwareRange(this.name, getMiscNetwork('BNB'), this.firmwareRange);
    }
}
