import { format } from 'date-fns';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { fromWei } from 'web3-utils';

import { FiatCurrencyCode } from '@suite-common/suite-config';
import { trezorLogo } from '@suite-common/suite-constants';
import { TokenDefinitions, getIsPhishingTransaction } from '@suite-common/token-definitions';
import { NetworkSymbol } from '@suite-common/wallet-config';
import {
    ExportFileType,
    RatesByTimestamps,
    Timestamp,
    TokenAddress,
    WalletAccountTransaction,
} from '@suite-common/wallet-types';
import { TransactionTarget } from '@trezor/connect';
import { BigNumber } from '@trezor/utils/src/bigNumber';
import {
    formatAmount,
    formatNetworkAmount,
    getFiatRateKey,
    getNftTokenId,
    isNftTokenTransfer,
    localizeNumber,
    roundTimestampToNearestPastHour,
} from '@suite-common/wallet-utils';

type AccountTransactionForExports = Omit<WalletAccountTransaction, 'targets'> & {
    targets: (TransactionTarget & { metadataLabel?: string })[];
};

type Data = {
    symbol: NetworkSymbol;
    accountName: string;
    type: ExportFileType;
    transactions: AccountTransactionForExports[];
    localCurrency: FiatCurrencyCode;
};

type Fields = {
    [key: string]: string;
    timestamp: string;
    date: string;
    time: string;
    type: string;
    txid: string;
    fee: string;
    feeSymbol: string;
    address: string;
    label: string;
    amount: string;
    symbol: string;
    fiat: string;
    other: string;
};

const CSV_NEWLINE = '\n';
const CSV_SEPARATOR = ';';

// Docs: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format
const dateFormat = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
} as const;

const timeFormat = {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZoneName: 'shortOffset',
} as const;

const formatIfDefined = (amount: string | undefined, symbol: NetworkSymbol) =>
    amount ? formatNetworkAmount(amount, symbol) : undefined;

const formatAmounts =
    (symbol: NetworkSymbol) =>
    (tx: AccountTransactionForExports): AccountTransactionForExports => ({
        ...tx,
        tokens: tx.tokens.map(token => ({
            ...token,
            amount: isNftTokenTransfer(token)
                ? `ID ${getNftTokenId(token)}`
                : formatAmount(token.amount, token.decimals),
        })),
        internalTransfers: tx.internalTransfers.map(internal => ({
            ...internal,
            amount: formatNetworkAmount(internal.amount, symbol),
        })),
        amount: formatNetworkAmount(tx.amount, symbol),
        fee: formatNetworkAmount(tx.fee, symbol),
        targets: tx.targets.map(tr => ({
            ...tr,
            amount: formatIfDefined(tr.amount, symbol),
        })),
        details: {
            ...tx.details,
            vin: tx.details.vin.map(v => ({
                ...v,
                value: formatIfDefined(v.value, symbol),
            })),
            vout: tx.details.vout.map(v => ({
                ...v,
                value: formatIfDefined(v.value, symbol),
            })),
            totalInput: formatNetworkAmount(tx.details.totalInput, symbol),
            totalOutput: formatNetworkAmount(tx.details.totalOutput, symbol),
        },
        ethereumSpecific: tx.ethereumSpecific
            ? {
                  ...tx.ethereumSpecific,
                  gasPrice: fromWei(tx.ethereumSpecific?.gasPrice ?? '0', 'gwei'),
              }
            : undefined,
        cardanoSpecific: tx.cardanoSpecific
            ? {
                  ...tx.cardanoSpecific,
                  withdrawal: formatIfDefined(tx.cardanoSpecific.withdrawal, symbol),
                  deposit: formatIfDefined(tx.cardanoSpecific.deposit, symbol),
              }
            : undefined,
    });

const loadPdfMake = async () => {
    const pdfMake = (await import(/* webpackChunkName: "pdfMake" */ 'pdfmake/build/pdfmake'))
        .default;
    const fonts = (await import(/* webpackChunkName: "pdfFonts" */ 'pdfmake/build/vfs_fonts'))
        .default;
    if (fonts?.pdfMake?.vfs) {
        pdfMake.vfs = fonts.pdfMake.vfs;
    }

    return pdfMake;
};

const makePdf = (
    definitions: TDocumentDefinitions,
    pdfMake: typeof import('pdfmake/build/pdfmake'),
): Promise<Blob> =>
    new Promise(resolve => {
        pdfMake.createPdf(definitions).getBlob(blob => {
            resolve(blob);
        });
    });

const prepareContent = (
    data: Data,
    tokenDefinitions: TokenDefinitions,
    historicFiatRates?: RatesByTimestamps,
): Fields[] => {
    const { transactions, symbol, localCurrency } = data;

    return transactions
        .map(formatAmounts(symbol))
        .flatMap(t => {
            if (getIsPhishingTransaction(t, tokenDefinitions)) {
                return null;
            }

            const sharedData = {
                date: new Intl.DateTimeFormat('default', dateFormat).format(
                    (t.blockTime || 0) * 1000,
                ),
                time: new Intl.DateTimeFormat('default', timeFormat).format(
                    (t.blockTime || 0) * 1000,
                ),
                timestamp: t.blockTime?.toString() || '',
                type: t.type.toUpperCase(),
                txid: t.txid,
            };
            const fiatRateKey = getFiatRateKey(t.symbol, localCurrency);
            const roundedTimestamp = roundTimestampToNearestPastHour(t.blockTime as Timestamp);
            const historicRate = historicFiatRates?.[fiatRateKey]?.[roundedTimestamp];

            let hasFeeBeenAlreadyUsed = t.type === 'recv'; // TODO: use similar logic as in TransactionItem
            let tokens: Array<Fields | null> = [];
            let internalTransfers: Array<Fields | null> = [];
            let targets: Array<Fields | null> = [];

            if (t.targets.length > 0) {
                targets = t.targets.map(target => {
                    if (!target?.addresses?.length || !target?.amount) {
                        return null;
                    }
                    const targetData = {
                        ...sharedData,
                        fee: !hasFeeBeenAlreadyUsed ? t.fee : '', // fee only once per tx
                        feeSymbol: !hasFeeBeenAlreadyUsed ? symbol.toUpperCase() : '',
                        address: target.isAddress ? target.addresses[0] : '', // SENT - it is destination address, RECV - it is MY address
                        label: target.isAddress && target.metadataLabel ? target.metadataLabel : '',
                        amount: target.isAddress ? target.amount : '',
                        symbol: target.isAddress ? symbol.toUpperCase() : '',
                        fiat:
                            target.isAddress && target.amount && historicRate
                                ? localizeNumber(
                                      new BigNumber(target.amount)
                                          .multipliedBy(historicRate)
                                          .toNumber(),
                                      undefined,
                                      2,
                                      2,
                                  ).toString()
                                : '',
                        other: !target.isAddress ? target.addresses[0] : '', // e.g. OP_RETURN
                    };
                    hasFeeBeenAlreadyUsed = true;

                    return targetData;
                });
            }

            if (t.tokens.length > 0) {
                tokens = t.tokens.map(token => {
                    if (!token?.contract || !token?.amount) {
                        return null;
                    }

                    const tokenFiatRateKey = getFiatRateKey(
                        t.symbol,
                        localCurrency,
                        token.contract as TokenAddress,
                    );
                    const historicTokenRate =
                        historicFiatRates?.[tokenFiatRateKey]?.[roundedTimestamp];

                    const tokenData = {
                        ...sharedData,
                        fee: !hasFeeBeenAlreadyUsed ? t.fee : '', // fee only once per tx
                        feeSymbol: !hasFeeBeenAlreadyUsed ? symbol.toUpperCase() : '',
                        address: token.to || '', // SENT - it is destination address, RECV - it is MY address
                        label: '', // token transactions do not have labels
                        amount: token.amount, // TODO: what to show if token.decimals missing so amount is not formatted correctly?
                        symbol: token.symbol?.toUpperCase() || token.contract, // if symbol not available, use contract address
                        fiat:
                            historicTokenRate && token.amount
                                ? localizeNumber(
                                      new BigNumber(token.amount)
                                          .multipliedBy(historicTokenRate)
                                          .toNumber(),
                                      undefined,
                                      2,
                                      2,
                                  ).toString()
                                : '',
                        other: '',
                    };
                    hasFeeBeenAlreadyUsed = true;

                    return tokenData;
                });
            }

            if (t.internalTransfers.length > 0) {
                internalTransfers = t.internalTransfers.map(internal => {
                    const internalTransferData = {
                        ...sharedData,
                        fee: !hasFeeBeenAlreadyUsed ? t.fee : '', // fee only once per tx
                        feeSymbol: !hasFeeBeenAlreadyUsed ? symbol.toUpperCase() : '',
                        address: internal.to || '', // SENT - it is destination address, RECV - it is MY address
                        label: '', // internal transactions do not have labels
                        amount: internal.amount,
                        symbol: symbol.toUpperCase(), // if symbol not available, use contract address
                        fiat:
                            internal.amount && historicRate
                                ? localizeNumber(
                                      new BigNumber(internal.amount)
                                          .multipliedBy(historicRate)
                                          .toNumber(),
                                      undefined,
                                      2,
                                      2,
                                  ).toString()
                                : '',
                        other: '',
                    };
                    hasFeeBeenAlreadyUsed = true;

                    return internalTransferData;
                });
            }

            return [...targets, ...tokens, ...internalTransfers];
        })
        .filter(record => record !== null) as Fields[];
};

const sanitizeCsvValue = (value: string) => {
    if (value.indexOf(CSV_SEPARATOR) !== -1) {
        return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
};

const prepareCsv = (
    data: Data,
    tokenDefinitions: TokenDefinitions,
    historicFiatRates?: RatesByTimestamps,
) => {
    const csvFields: Fields = {
        timestamp: 'Timestamp',
        date: 'Date',
        time: 'Time',
        type: 'Type',
        txid: 'Transaction ID',
        fee: 'Fee',
        feeSymbol: 'Fee unit',
        address: 'Address',
        label: 'Label',
        amount: 'Amount',
        symbol: 'Amount unit',
        fiat: `Fiat (${data.localCurrency.toUpperCase()})`,
        other: 'Other',
    };

    const content = prepareContent(data, tokenDefinitions, historicFiatRates);

    const lines: string[] = [];

    const fieldKeys = Object.keys(csvFields);
    const fieldValues = Object.values(csvFields);

    // Prepare header
    let line: string[] = [];
    fieldValues.forEach(v => {
        line.push(v);
    });

    lines.push(line.join(CSV_SEPARATOR));

    // Prepare data
    content.forEach(item => {
        line = [];

        fieldKeys.forEach(field => {
            line.push(sanitizeCsvValue(item[field]));
        });

        lines.push(line.join(CSV_SEPARATOR));
    });

    return lines.join(CSV_NEWLINE);
};

const preparePdf = (
    data: Data,
    tokenDefinitions: TokenDefinitions,
    historicFiatRates?: RatesByTimestamps,
): TDocumentDefinitions => {
    const pdfFields = {
        dateTime: 'Date & Time',
        type: 'Type',
        txid: 'Transaction ID',
        feeWithSymbol: `Fee`,
        addressWithLabel: 'Address',
        amountWithSymbol: 'Amount',
    };

    const fieldKeys = Object.keys(pdfFields);
    const fieldValues = Object.values(pdfFields);

    const content = prepareContent(data, tokenDefinitions, historicFiatRates);

    const lines: any[] = [];
    content.forEach(item => {
        const line: string[] = [];

        fieldKeys.forEach(field => {
            const record = item[field];
            if (record) {
                line.push(record);
            }

            switch (field) {
                case 'dateTime':
                    line.push(`${item.date}, ${item.time}`);
                    break;
                case 'feeWithSymbol':
                    line.push(`${item.fee} ${item.feeSymbol}`);
                    break;
                case 'addressWithLabel':
                    line.push(
                        `${item.address}${item.label ? ` - ${item.label}` : ''}${
                            item.other ? ` ${item.other}` : ''
                        }`,
                    );
                    break;
                case 'amountWithSymbol':
                    line.push(`${item.amount} ${item.symbol}`);
                    break;
                // no default
            }
        });

        lines.push(line);
    });

    return {
        pageOrientation: 'landscape',
        header: [
            {
                columns: [
                    {
                        text: `${data.accountName} (${data.symbol.toUpperCase()})`,
                        fontSize: 18,
                        bold: true,
                        alignment: 'left',
                        margin: [39, 12, 0, 0],
                    },
                    {
                        image: `data:image/png;base64,${trezorLogo}`,
                        width: 140,
                        alignment: 'right',
                        margin: [0, 10, 25, 0],
                    },
                ],
            },
        ],
        footer: (page: number, count: number) => [
            {
                text: `${page} of ${count}`,
                fontSize: 8,
                alignment: 'right',
                margin: [0, 6, 50, 0],
            },
        ],
        content: [
            {
                table: {
                    widths: [45, 30, 290, 65, 203, 65],
                    headerRows: 1,
                    body: [fieldValues, ...lines],
                },
                fontSize: 8,
            },
        ],
    };
};

export const formatData = async (
    data: Data,
    tokenDefinitions: TokenDefinitions,
    historicFiatRates?: RatesByTimestamps,
) => {
    const { symbol, type, transactions } = data;

    switch (type) {
        case 'csv': {
            const csv = prepareCsv(data, tokenDefinitions, historicFiatRates);

            return new Blob([csv], { type: 'text/csv;charset=utf-8' });
        }
        case 'pdf': {
            const pdfLayout = preparePdf(data, tokenDefinitions, historicFiatRates);
            const pdfMake = await loadPdfMake();
            const pdf = await makePdf(pdfLayout, pdfMake);

            return pdf;
        }
        case 'json': {
            const json = JSON.stringify(
                {
                    coin: symbol,
                    transactions: transactions.map(formatAmounts(symbol)),
                },
                null,
                2,
            );

            return new Blob([json], { type: 'text/json;charset=utf-8' });
        }
        // no default
    }
};

export const getExportedFileName = (accountName: string, type: ExportFileType) => {
    const accountNameSanitized = accountName
        .slice(0, 240) // limit the file name length
        .replace(/[^a-z0-9]/gi, '_') // replace any special character by _ symbol
        .concat('_') // add one _ at the end as separator from date
        .replace(/_{2,}/g, '_'); // prevent multiple __ in a row

    const currentDateTime = new Date();
    const date = format(currentDateTime, 'yyyyMMdd');
    const time = format(currentDateTime, 'HHmmss');

    return `${accountNameSanitized}${date}T${time}.${type}`;
};
