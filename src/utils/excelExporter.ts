/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';

export interface ExcelSheetData {
  name: string;
  title: string;
  subtitle?: string;
  period?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  colWidths?: number[];
}

/**
 * Universal Excel Exporter for PT Atrium Management Group
 * Generates true .xlsx workbooks with proper headers, formatted numeric columns, and auto-adjusted widths.
 */
export function exportReportToExcel(
  filename: string,
  sheets: ExcelSheetData[]
) {
  const wb = XLSX.utils.book_new();

  sheets.forEach((sheetData) => {
    const rawData: (string | number | null | undefined)[][] = [];

    // Header metadata block matching PT Atrium Management Group standard
    rawData.push(['PT ATRIUM MANAGEMENT GROUP', '', '', '', 'Internal Financial Statements']);
    rawData.push([sheetData.title.toUpperCase()]);
    if (sheetData.subtitle || sheetData.period) {
      const sub = [
        sheetData.period ? `For the period ${sheetData.period}` : '',
        sheetData.subtitle || '',
        '(Presented in Rupiah)',
      ]
        .filter(Boolean)
        .join(' | ');
      rawData.push([sub]);
    }
    rawData.push([]); // Spacer row

    // Table Column Headers
    rawData.push(sheetData.headers);

    // Table Rows
    sheetData.rows.forEach((r) => {
      rawData.push(r);
    });

    // Footer metadata
    rawData.push([]);
    rawData.push([
      `PT ATRIUM MANAGEMENT GROUP | Generated on ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')} WIB`,
    ]);

    // Create Worksheet
    const ws = XLSX.utils.aoa_to_sheet(rawData);

    // Set Column Widths
    const widths: { wch: number }[] = [];
    if (sheetData.colWidths && sheetData.colWidths.length > 0) {
      sheetData.colWidths.forEach((w) => widths.push({ wch: w }));
    } else {
      // Auto-calculate column widths
      sheetData.headers.forEach((h, colIdx) => {
        let maxLen = Math.max(h.length, 12);
        sheetData.rows.forEach((row) => {
          const val = row[colIdx];
          if (val !== undefined && val !== null) {
            const strVal = typeof val === 'number' ? val.toLocaleString('id-ID') : String(val);
            if (strVal.length > maxLen) {
              maxLen = Math.min(strVal.length, 50);
            }
          }
        });
        widths.push({ wch: maxLen + 4 });
      });
    }
    ws['!cols'] = widths;

    XLSX.utils.book_append_sheet(wb, ws, sheetData.name.slice(0, 31));
  });

  const finalFileName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalFileName);
}
