import { Capability } from '@trezor/protobuf/src/messages-schema';
import { AbstractMethod, Payload } from '../../../core/AbstractMethod';
import { CallMethodPayload } from '../../../events';
import { getFirmwareRange } from '../../common/paramsValidator';
import { getMiscNetwork } from '../../../data/coinInfo';

export abstract class CardanoAbstractMethod<
    Name extends CallMethodPayload['method'],
    Params = undefined,
> extends AbstractMethod<Name, Params> {
    requiredDeviceCapabilities = [Capability.Cardano];

    constructor(message: { id?: number; payload: Payload<Name> }) {
        super(message);
        this.firmwareRange = getFirmwareRange(
            this.name,
            getMiscNetwork('Cardano'),
            this.firmwareRange,
        );
    }
}
