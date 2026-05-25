// src/types/jspdf.d.ts
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: AutoTableOptions) => jsPDF;
    lastAutoTable?: {
      finalY: number;
      [key: string]: any;
    };
  }

  interface AutoTableOptions {
    head?: string[][];
    body?: any[][];
    startY?: number;
    styles?: Record<string, any>;
    headStyles?: Record<string, any>;
    // Add other options you use
  }
}