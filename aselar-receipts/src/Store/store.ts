import { createSlice, PayloadAction, configureStore, createAsyncThunk } from '@reduxjs/toolkit';

// Interfaces for Inventory
// In interfaces (add ? to image)
export interface Category {
  _id: string;
  name: string;
  description: string;
  image?: string;  // Already optional here—good
  items: Item[];
  user: string;
}
const token = localStorage.getItem("token");
export interface Item {
  _id: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  image?: string;
  lowStock: string;
  categoryId: string;
  user: string;
  unit: string; // Added for bulk upload
  expiryDate: string; // Added for bulk upload, ISO format
}

interface InventoryState {
  categories: Category[];
  // Removed unused 'items' array—everything nests under categories
  loading: boolean;
  error: string | null;
}

// Initial State for Inventory
const initialInventoryState: InventoryState = {
  categories: [],
  loading: false,
  error: null,
};

// In submitCategory thunk (make param optional, handle empty)
export const submitCategory = createAsyncThunk(
  'categories/createCategory',
  async (categoryData: { name: string; description: string; image?: string }, { rejectWithValue }) => {  // Added ? here
    try {
      // Fallback to empty string if no image
      const dataToSend = {
        ...categoryData,
        image: categoryData.image || ''  // Ensures backend gets '' if undefined
      };
      
      console.log('Submitting to API:', { 
        ...dataToSend, 
        imageLength: dataToSend.image?.length 
      });

      const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/add-category`, {
        method: 'POST',
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to create category');
      }

      const result = await response.json();
      return result.category;
    } catch (error) {
      console.error('Submit category error:', error);
      return rejectWithValue('Network error or server unavailable');
    }
  }
);
export const submitItem = createAsyncThunk(
  'items/submitItem',
  async (payload: { categoryId: string; item: Omit<Item, '_id'> }) => {
    try {
      const { categoryId, item } = payload;
      const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/add-item/${categoryId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        throw new Error('Failed to submit item');
      }

      const newItem = await response.json();
      return { categoryId, item: newItem };
    } catch (error) {
      console.error('Submit item error:', error);
      throw error;
    }
  }
);

export const getCategories = createAsyncThunk(
  'categories/getCategories',
  async () => {
    try {
      console.log('Making API request');
      const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/get-categories`, {
        credentials: 'include',
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
      });
      console.log("Response", response);

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const categories = await response.json();
      return categories;
    } catch (error) {
      console.error('Fetch categories error:', error);
      throw error;
    }
  }
);

export const removeItem = createAsyncThunk(
  'items/removeItem',
  async (payload: { categoryId: string; itemId: string }) => {
    try {
      console.log("Attempting to delete:", payload);
      
      const response = await fetch(
        `${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/remove-item/${payload.categoryId}/${payload.itemId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        }
      );
      
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      
      const responseText = await response.text();
      console.log("Response body:", responseText);

      if (!response.ok) {
        throw new Error(`Failed to remove item: ${responseText}`);
      }

      return payload;
    } catch (error) {
      console.error('Remove item error:', error);
      throw error;
    }
  }
);

// Thunk for deleting category (fixes local-only delete)
export const removeCategory = createAsyncThunk(
  'categories/removeCategory',
  async (categoryId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/remove-category/${categoryId}`, {
        method: 'DELETE',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to delete category');
      }

      return categoryId;
    } catch (error) {
      console.error('Remove category error:', error);
      return rejectWithValue('Network error or server unavailable');
    }
  }
);

export const editItem = createAsyncThunk(
  'inventory/editItem',
  async (payload: { categoryId: string; itemId: string; updates: any }) => {
    const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/items/${payload.categoryId}/${payload.itemId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload.updates),
    });
    if (!response.ok) throw new Error('Failed to edit item');
    return response.json();
  }
);

// New Bulk Upload Thunk
export const bulkUpload = createAsyncThunk<
  { categories: Category[] }, // Return type
  File, // Argument type
  { rejectValue: string } // Reject value type for error handling
>(
  'inventory/bulkUpload',
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/bulk-upload`, {  // Standardized port to 5009
        method: 'POST',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Bulk upload failed');
      }

      const result = await response.json();
      return result; // Expecting { categories: Category[] } from the backend
    } catch (error) {
      console.error('Bulk upload error:', error);
      return rejectWithValue('Network error or server unavailable');
    }
  }
);

// Inventory Slice
const inventorySlice = createSlice({
  name: 'inventory',
  initialState: initialInventoryState,
  reducers: {
    // No sync reducers needed for delete—thunk handles it
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(getCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch categories';
      })
      .addCase(submitCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories.push(action.payload);
      })
      .addCase(submitCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Something went wrong';
      })
      .addCase(submitItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitItem.fulfilled, (state, action) => {
        state.loading = false;
        const { categoryId, item } = action.payload;
        const category = state.categories.find((cat) => cat._id === categoryId);
        if (category) {
          category.items.push(item);
        }
      })
      .addCase(submitItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to submit item';
      })
      .addCase(removeItem.fulfilled, (state, action) => {
        const { categoryId, itemId } = action.payload;
        const category = state.categories.find((c) => c._id === categoryId);
        if (category) {
          category.items = category.items.filter((item) => item._id !== itemId);
        }
      })
      // Handle category deletion after API success
      .addCase(removeCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = state.categories.filter((category) => category._id !== action.payload);
      })
      .addCase(removeCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string ?? 'Failed to delete category';
      })
      .addCase(editItem.fulfilled, (state, action) => {
        const { categoryId, _id, ...updates } = action.payload;
        const category = state.categories.find((cat) => cat._id === categoryId);
        if (category) {
          const item = category.items.find((item) => item._id === _id);
          if (item) Object.assign(item, updates);
        }
      })
      .addCase(bulkUpload.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpload.fulfilled, (state, action) => {
        state.loading = false;
        // Assuming the backend returns updated categories
        state.categories = action.payload.categories || state.categories;
      })
      .addCase(bulkUpload.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string ?? 'Bulk upload failed';
      });
  },
});

// Interfaces for Services
export interface Service {
  id: string;
  name: string;
  rate: number;
  time: number;
  description: string;
  expenses: number;
  sales: number;
  profit: number;
}

interface ServicesState {
  services: Service[];
}

// Initial State for Services
const initialServicesState: ServicesState = {
  services: [],
};

// Services Slice
const servicesSlice = createSlice({
  name: 'services',
  initialState: initialServicesState,
  reducers: {
    addService(state, action: PayloadAction<Omit<Service, 'sales' | 'profit'>>) {
      const { rate, time, expenses, description, ...rest } = action.payload;
      const sales = rate * time;
      const profit = sales - expenses;

      const newService: Service = {
        ...rest,
        id: Date.now().toString(),
        rate,
        time,
        expenses,
        description,
        profit,
        sales,
      };
      state.services.push(newService);
    },
    removeService(state, action: PayloadAction<string>) {
      state.services = state.services.filter(
        (service) => service.id !== action.payload
      );
    },
  },
});

// Expenses Slice
interface ExpensesState {
  totalExpenses: number; // General expenses
  serviceExpenses: number; // Service-specific expenses
}

const initialExpensesState: ExpensesState = {
  totalExpenses: 0,
  serviceExpenses: 0,
};

const expensesSlice = createSlice({
  name: 'expenses',
  initialState: initialExpensesState,
  reducers: {
    setTotalExpenses: (state, action: PayloadAction<number>) => {
      state.totalExpenses = action.payload;
    },
    setServiceExpenses: (state, action: PayloadAction<number>) => {
      state.serviceExpenses = action.payload;
    },
  },
});

// Auth Slice
export interface User {
  name: string;
  nameOfBusiness: string;
  password: string;
  emailBusiness: string;
  businessPhone: string;
  profilePicture: File | null | string; // File type for profile picture
}

interface AuthState {
  isLoggedIn: boolean;
  name: string;
  user: User;
}

// Retrieve the name from localStorage and parse it
const storedName = localStorage.getItem('name');
const parsedName: string | null = storedName ? JSON.parse(storedName) : null;

// Define the state object as a reference
const authInitialState: AuthState = {
  isLoggedIn: false,
  name: parsedName || '',
  user: {
    name: '',
    nameOfBusiness: '',
    password: '',
    emailBusiness: '',
    businessPhone: '',
    profilePicture: '',
  },
};

// Create the slice with typed actions and state
const authSlice = createSlice({
  name: 'auth',
  initialState: authInitialState,
  reducers: {
    SET_LOGIN(state, action: PayloadAction<boolean>) {
      state.isLoggedIn = action.payload;
    },
    SET_NAME(state, action: PayloadAction<string>) {
      localStorage.setItem('name', JSON.stringify(action.payload));
      state.name = action.payload;
    },
    SET_USER(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
  },
});

// Export actions with proper types
export const { SET_LOGIN, SET_NAME, SET_USER } = authSlice.actions;

// Define and export selectors with state typing
export const selectIsLoggedIn = (state: { auth: AuthState }): boolean =>
  state.auth.isLoggedIn;
export const selectName = (state: { auth: AuthState }): string =>
  state.auth.name;
export const selectUser = (state: { auth: AuthState }): User =>
  state.auth.user;

// Combined Reducers (added auth)
const rootReducer = {
  inventory: inventorySlice.reducer,
  services: servicesSlice.reducer,
  expenses: expensesSlice.reducer,
  auth: authSlice.reducer,  // Fixed: Now included
};

// Configure Store
export const store = configureStore({
  reducer: rootReducer,
});

// Export actions from slices
export const { addService, removeService } = servicesSlice.actions;
export const { setTotalExpenses, setServiceExpenses } = expensesSlice.actions;
// Fixed: No need to destructure from slice.actions since removeCategory is a thunk exported directly above

// Export RootState and AppDispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;