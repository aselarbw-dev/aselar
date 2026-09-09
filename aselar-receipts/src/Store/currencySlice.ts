import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_CURRENCY } from '../utility/currencies';

interface CurrencyState {
  code: string;
}

const initialState: CurrencyState = {
  code: DEFAULT_CURRENCY,
};

const currencySlice = createSlice({
  name: 'currency',
  initialState,
  reducers: {
    setCurrency(state, action: PayloadAction<string>) {
      state.code = action.payload;
    },
  },
});

export const { setCurrency } = currencySlice.actions;
export default currencySlice.reducer;