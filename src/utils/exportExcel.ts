import * as XLSX from 'xlsx'

export interface SheetConfig {
  name: string
  headers: string[]
  rows: (string | number | null | undefined)[][]
  columnWidths?: number[] // character widths per column
}

/**
 * Creates and downloads an Excel workbook with one or more sheets.
 * @param filename  Output filename WITHOUT extension
 * @param sheets    Array of sheet configurations
 */
export function downloadExcel(filename: string, sheets: SheetConfig[]): void {
  const wb = XLSX.utils.book_new()

  for (const sheet of sheets) {
    // Build data array: [headers, ...rows]
    const data: (string | number | null | undefined)[][] = [
      sheet.headers,
      ...sheet.rows,
    ]

    const ws = XLSX.utils.aoa_to_sheet(data)

    // Style header row (bold + background) — xlsx CE supports limited styling
    const headerRange = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!ws[cellAddress]) continue
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } }, // blue-600
        alignment: { horizontal: 'center' },
        border: {
          bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        },
      }
    }

    // Column widths
    if (sheet.columnWidths) {
      ws['!cols'] = sheet.columnWidths.map(w => ({ wch: w }))
    } else {
      // Auto-width: use max character length in each column
      const colWidths: number[] = sheet.headers.map(h => h.length + 4)
      for (const row of sheet.rows) {
        row.forEach((cell, i) => {
          const len = String(cell ?? '').length + 2
          if (len > (colWidths[i] ?? 0)) colWidths[i] = len
        })
      }
      ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 50) }))
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }

  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/** Utility: format a Date or ISO string to DD/MM/YYYY */
export function fmtDate(value: string | Date | undefined | null): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
