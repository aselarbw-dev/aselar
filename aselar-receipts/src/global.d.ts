// For Vite projects:
interface ImportMetaEnv {
    readonly VITE_NODE_ENV: 'development' | 'production';
    readonly VITE_API_URL: string;
    // more env variables...
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  
  // For process.env fallback (optional)
  declare namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production';
      // other variables
    }
  }