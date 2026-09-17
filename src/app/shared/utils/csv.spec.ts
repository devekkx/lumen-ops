import { CsvColumn, toCsv } from './csv';

interface Row {
	code: string;
	note: string;
	count: number | null;
}

const columns: readonly CsvColumn<Row>[] = [
	{ key: 'code', header: 'Code' },
	{ key: 'note', header: 'Note' },
	{ key: 'count', header: 'Count' }
];

describe('toCsv', () => {
	it('renders a header row followed by one row per record, CRLF-joined', () => {
		const rows: Row[] = [
			{ code: 'A-1', note: 'fine', count: 3 },
			{ code: 'A-2', note: 'also fine', count: 0 }
		];

		expect(toCsv(columns, rows)).toBe('Code,Note,Count\r\nA-1,fine,3\r\nA-2,also fine,0');
	});

	it('quotes a field containing a comma, a quote, or a newline, doubling any embedded quote', () => {
		const rows: Row[] = [{ code: 'A-1', note: 'has, a comma', count: 1 }];
		expect(toCsv(columns, rows)).toContain('"has, a comma"');

		const withQuote: Row[] = [{ code: 'A-2', note: 'she said "go"', count: 1 }];
		expect(toCsv(columns, withQuote)).toContain('"she said ""go"""');

		const withNewline: Row[] = [{ code: 'A-3', note: 'line one\nline two', count: 1 }];
		expect(toCsv(columns, withNewline)).toContain('"line one\nline two"');
	});

	it('renders null and undefined as an empty field rather than the literal string', () => {
		const rows: Row[] = [{ code: 'A-1', note: 'x', count: null }];
		expect(toCsv(columns, rows)).toBe('Code,Note,Count\r\nA-1,x,');
	});

	it('renders just the header for an empty row set', () => {
		expect(toCsv(columns, [])).toBe('Code,Note,Count');
	});

	it('neutralises a leading formula character rather than letting a spreadsheet evaluate it', () => {
		const triggers = ['=SUM(A1:A9)', '+1+1', '-1+1', '@SUM(1)', '\tuh oh'];

		for (const note of triggers) {
			const rendered = toCsv(columns, [{ code: 'A-1', note, count: 1 }]);
			expect(rendered).toContain(`'${note}`);
		}
	});

	it('leaves an ordinary value with no leading formula character untouched', () => {
		const rows: Row[] = [{ code: 'A-1', note: 'a - b (not a formula)', count: 1 }];
		expect(toCsv(columns, rows)).toContain('a - b (not a formula)');
	});
});
