/* Client-side only, deliberately: mock-api/server.ts has no export endpoint,
   and a page's own already-loaded rows are already exactly what the table
   shows the person exporting - going back to the server for a fresh dump
   would risk exporting a different result set than what's on screen if a
   sort or filter changed in between. Exports the current page, not the
   whole collection, for the same reason ApiService.getBlob() sits unused: no
   screen in this app has ever needed a fetch shaped as one big file rather
   than a paged read. */

export interface CsvColumn<T> {
	key: Extract<keyof T, string>;
	header: string;
}

/* A cell starting with =, +, -, @, or a tab is a formula to Excel/Sheets/
   LibreOffice the moment this file is opened, not a value - a fault
   description or a crew name (both free text an ADMIN or a citizen types,
   see edit-crew-dialog.component.ts and fault-form.component.ts) could
   otherwise smuggle a formula into whoever opens the export. Prefixing with
   an apostrophe is the standard neutraliser: every one of those programs
   already treats a leading apostrophe as "the rest of this is literal text",
   so the value round-trips unchanged for a human reader while never
   evaluating as a formula. */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/* RFC 4180 quoting: a field is wrapped in quotes only when it actually needs
   it (contains a comma, a quote, or a newline), and an embedded quote is
   escaped by doubling it - the one rule spreadsheet software actually
   expects, not just "wrap everything". */
const escapeCell = (value: unknown): string => {
	const raw = value === null || value === undefined ? '' : String(value);
	const text = FORMULA_TRIGGER.test(raw) ? `'${raw}` : raw;
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = <T>(columns: readonly CsvColumn<T>[], rows: readonly T[]): string => {
	const header = columns.map((column) => escapeCell(column.header)).join(',');
	const lines = rows.map((row) => columns.map((column) => escapeCell(row[column.key])).join(','));
	/* CRLF, not \n - the format RFC 4180 actually specifies, and what a
	   Windows-opened spreadsheet expects without a BOM to guess from. */
	return [header, ...lines].join('\r\n');
};

/* The DOM side of an export - a temporary object URL and an <a download>
   click, never attached to the document. Kept separate from toCsv() so the
   actual formatting logic stays a pure function a spec can call directly,
   without a browser DOM to fake. */
export const downloadCsv = (filename: string, csv: string): void => {
	/* \uFEFF: a UTF-8 BOM, so Excel (which otherwise guesses ANSI/Latin-1 for
	   a BOM-less CSV) renders this app's accented Spanish copy correctly
	   instead of as mojibake. */
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
