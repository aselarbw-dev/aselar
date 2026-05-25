import { createSlice, PayloadAction} from '@reduxjs/toolkit';
type Product = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    qrCode: string;
    imageUrl: string;
  };
  
  interface InventoryState {
    products: Product[];
    total: number;
  }
  
  const initialState: InventoryState = {
    products: [],
    total: 0,
  };
  
const scannerSlice = createSlice({
    name: "inventory",
    initialState,
    reducers: {
      addProduct: (state, action: PayloadAction<Product>) => {
        const existingProduct = state.products.find((p) => p.id === action.payload.id);
        if (existingProduct) {
          existingProduct.quantity += action.payload.quantity;
        } else {
          state.products.push(action.payload);
        }
        state.total = state.products.reduce(
          (sum, product) => sum + product.price * product.quantity,
          0
        );
      },
      removeProduct: (state, action: PayloadAction<string>) => {
        state.products = state.products.filter((product) => product.id !== action.payload);
        state.total = state.products.reduce(
          (sum, product) => sum + product.price * product.quantity,
          0
        );
      },
      clearInventory: (state) => {
        state.products = [];
        state.total = 0;
      },
    },
  });
  
  export const { addProduct, removeProduct, clearInventory } = scannerSlice.actions;
  export default scannerSlice.reducer;
  