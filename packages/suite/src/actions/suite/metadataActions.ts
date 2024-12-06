import { createAction } from '@reduxjs/toolkit';

import { selectDevices } from '@suite-common/wallet-core';
import { Account } from '@suite-common/wallet-types';
import { StaticSessionId } from '@trezor/connect';
import { createZip } from '@trezor/utils';
import { notificationsActions } from '@suite-common/toast-notifications';

import { METADATA, METADATA_LABELING } from 'src/actions/suite/constants';
import { Dispatch, GetState } from 'src/types/suite';
import {
    MetadataProvider,
    DeviceMetadata,
    Labels,
    DataType,
    WalletLabels,
    AccountLabels,
} from 'src/types/suite/metadata';
import * as metadataUtils from 'src/utils/suite/metadata';
import { selectSelectedProviderForLabels } from 'src/reducers/suite/metadataReducer';
import type { AbstractMetadataProvider, PasswordManagerState } from 'src/types/suite/metadata';

import { getProviderInstance } from './metadataProviderActions';

export type MetadataAction =
    | { type: typeof METADATA.ENABLE }
    | { type: typeof METADATA.DISABLE }
    | { type: typeof METADATA.SET_EDITING; payload: string | undefined }
    | { type: typeof METADATA.SET_INITIATING; payload: boolean }
    | {
          type: typeof METADATA.SET_DEVICE_METADATA;
          payload: { deviceState: StaticSessionId; metadata: DeviceMetadata };
      }
    | {
          type: typeof METADATA.SET_DEVICE_METADATA_PASSWORDS;
          payload: { deviceState: StaticSessionId; metadata: DeviceMetadata };
      }
    | {
          type: typeof METADATA.REMOVE_PROVIDER;
          payload: MetadataProvider;
      }
    | {
          type: typeof METADATA.ADD_PROVIDER;
          payload: MetadataProvider;
      }
    | {
          type: typeof METADATA.SET_DATA;
          payload: {
              provider: MetadataProvider;
              data: Record<string, Labels>;
          };
      }
    | {
          type: typeof METADATA.SET_SELECTED_PROVIDER;
          payload: {
              dataType: DataType;
              clientId: string;
          };
      }
    | {
          type: typeof METADATA.SET_ERROR_FOR_DEVICE;
          payload: { deviceState: StaticSessionId; failed: boolean };
      }
    | {
          type: typeof METADATA.ACCOUNT_ADD;
          payload: Account;
      };

export const setAccountAdd = createAction(METADATA.ACCOUNT_ADD, (payload: Account) => ({
    payload,
}));

/**
 * dispose metadata from all labelable objects.
 */
export const disposeMetadata = () => (dispatch: Dispatch, getState: GetState) => {
    const provider = selectSelectedProviderForLabels(getState());

    if (!provider) {
        return;
    }

    dispatch({
        type: METADATA.SET_DATA,
        payload: {
            provider,
            data: undefined,
        },
    });
};

export const disposeMetadataKeys = () => (dispatch: Dispatch, getState: GetState) => {
    const devices = selectDevices(getState());

    getState().wallet.accounts.forEach(account => {
        const updatedAccount = JSON.parse(JSON.stringify(account));

        delete updatedAccount.metadata[METADATA_LABELING.ENCRYPTION_VERSION];
        dispatch(setAccountAdd(updatedAccount));
    });

    devices.forEach(device => {
        if (device.state) {
            // set metadata as disabled for this device, remove all metadata related information
            dispatch({
                type: METADATA.SET_DEVICE_METADATA,
                payload: {
                    deviceState: device.state.staticSessionId,
                    metadata: {},
                },
            });
        }
    });
};

export const enableMetadata = (): MetadataAction => ({
    type: METADATA.ENABLE,
});

export const disableMetadata = () => (dispatch: Dispatch) => {
    dispatch({
        type: METADATA.DISABLE,
    });
    // dispose metadata values and keys
    dispatch(disposeMetadata());
    dispatch(disposeMetadataKeys());
};

export const setMetadata =
    ({
        provider,
        fileName,
        data,
    }: {
        provider: MetadataProvider;
        fileName: string;
        data: WalletLabels | AccountLabels | PasswordManagerState | undefined;
    }) =>
    (dispatch: Dispatch) => {
        dispatch({
            type: METADATA.SET_DATA,
            payload: {
                provider,
                data: {
                    [fileName]: data,
                },
            },
        });
    };

export const encryptAndSaveMetadata = async ({
    data,
    aesKey,
    fileName,
    providerInstance,
}: {
    data: AccountLabels | WalletLabels | PasswordManagerState;
    aesKey: string;
    fileName: string;
    providerInstance: AbstractMetadataProvider;
}) => {
    const encrypted = await metadataUtils.encrypt(
        {
            version: METADATA_LABELING.FORMAT_VERSION,
            ...data,
        },
        aesKey,
    );

    return providerInstance.setFileContent(fileName, encrypted);
};

export const exportMetadataToLocalFile = () => async (dispatch: Dispatch, getState: GetState) => {
    const providerInstance = dispatch(
        getProviderInstance({
            clientId: selectSelectedProviderForLabels(getState())!.clientId,
            dataType: 'labels',
        }),
    );

    if (!providerInstance) return;

    const filesListResult = await providerInstance.getFilesList();

    if (!filesListResult.success || !filesListResult.payload?.length) {
        dispatch(
            notificationsActions.addToast({ type: 'error', error: 'Exporting labels failed' }),
        );

        return;
    }

    const files = filesListResult.payload;

    return Promise.all(
        files.map(file => {
            return providerInstance.getFileContent(file).then(result => {
                if (!result.success) throw new Error(result.error);

                return { name: file, content: result.payload };
            });
        }),
    )
        .then(filesContent => {
            const zipBlob = createZip(filesContent);
            // Trigger download
            const a = document.createElement('a');
            a.href = URL.createObjectURL(zipBlob);
            a.download = 'archive.zip';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        })
        .catch(_err => {
            dispatch(
                notificationsActions.addToast({ type: 'error', error: 'Exporting labels failed' }),
            );

            return;
        });
};
