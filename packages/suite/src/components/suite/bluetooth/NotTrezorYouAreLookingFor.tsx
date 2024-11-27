import { useState } from 'react';

import { Card, CollapsibleBox, ElevationUp, Link, Text } from '@trezor/components';
import { spacings } from '@trezor/theme';

import { BluetoothTips } from './BluetoothTips';

type NotTrezorYouAreLookingForProps = {
    onReScanClick: () => void;
};

export const NotTrezorYouAreLookingFor = ({ onReScanClick }: NotTrezorYouAreLookingForProps) => {
    const [showTips, setShowTips] = useState(false);

    return (
        <CollapsibleBox
            margin={{ horizontal: spacings.md }}
            fillType="none"
            paddingType="none"
            headingSize="medium"
            toggleIconName="chevronDown"
            heading={
                <Link typographyStyle="hint" variant="underline" onClick={() => setShowTips(true)}>
                    <Text variant="tertiary">Not the Trezor you’re looking for?</Text>
                </Link>
            }
        >
            {showTips && (
                <ElevationUp>
                    <Card minWidth={475} paddingType="none">
                        <BluetoothTips
                            onReScanClick={onReScanClick}
                            header="Check tips & try again"
                        />
                    </Card>
                </ElevationUp>
            )}
        </CollapsibleBox>
    );
};
