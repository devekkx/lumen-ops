export interface CsvColumn<T> {
	key: Extract<keyof T, string>;
	header: string;
}

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

const escapeCell = (value: unknown): string => {
	const raw = value === null || value === undefined ? '' : String(value);
	const text = FORMULA_TRIGGER.test(raw) ? `'${raw}` : raw;
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = <T>(columns: readonly CsvColumn<T>[], rows: readonly T[]): string => {
	const header = columns.map((column) => escapeCell(column.header)).join(',');
	const lines = rows.map((row) => columns.map((column) => escapeCell(row[column.key])).join(','));
	return [header, ...lines].join('\r\n');
};

/* The DOM side of an export - a temporary object URL and an <a download>
   click, never attached to the document. Kept separate from toCsv() so the
   actual formatting logic stays a pure function a spec can call directly,
   without a browser DOM to fake. */
export const downloadCsv = (filename: string, csv: string): void => {
	const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	try {
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename;
		anchor.click();
	} finally {
		URL.revokeObjectURL(url);
	}
};
