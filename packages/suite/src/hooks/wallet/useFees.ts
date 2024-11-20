import { useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';

import { NetworkSymbol } from "@suite-common/wallet-config";
import {
  updateFeeInfoThunk,
} from '@suite-common/wallet-core';

const networkToInterval = (symbol: NetworkSymbol): number => {
  switch (symbol) {
    case 'pol':
      return 1000;
    default:
      return 10000;
  }
}

export const useFees = (symbol: NetworkSymbol) => {
  const dispatch = useDispatch();

  const refreshFees = useCallback(() => {
    dispatch(updateFeeInfoThunk(symbol))
  }, [dispatch, symbol])

  useEffect(() => {
    refreshFees();
    const interval = setInterval(refreshFees, networkToInterval(symbol));

    return () => {
      clearInterval(interval)
    }
  }, [refreshFees, symbol])
}
