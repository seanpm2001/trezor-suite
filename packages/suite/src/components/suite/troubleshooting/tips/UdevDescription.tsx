import { UdevDownload } from 'src/components/suite';
import { Translation } from 'src/components/suite/Translation';
import { Column } from '@trezor/components';

export const UdevDescription = () => (
    <Column alignItems="start">
        <Translation id="TR_TROUBLESHOOTING_TIP_UDEV_INSTALL_DESCRIPTION" />
        <UdevDownload />
    </Column>
);
