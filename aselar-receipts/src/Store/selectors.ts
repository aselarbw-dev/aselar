// selectors.ts
//import { RootState } from './hooks'; // Adjust path to your hooks.ts
import type { RootState } from './store';
// Auth Selectors
export const selectIsLoggedIn = (state: RootState): boolean =>
  state.auth.isLoggedIn;
export const selectName = (state: RootState): string =>
  state.auth.name;
export const selectUser = (state: RootState) =>
  state.auth.user;

// Optional: Inventory Selector (if you want central for categories)
export const selectCategories = (state: RootState) => state.inventory.categories;

// Usage in components: import { selectIsLoggedIn } from './selectors';
// const isLoggedIn = useAppSelector(selectIsLoggedIn);