#!/usr/bin/env node
/* Reports keys present in one locale and missing from the other, plus empty
   values, and exits non-zero on any finding.
 *
 * Exercise 4.3 exists because translation drifts silently: the real repo's
 * es.json carries 644 keys against 634 in en.json, and nothing told anyone.
 * Run this in CI and that cannot happen twice.
 */

/* CommonJS on purpose: the brief names this file scripts/check-i18n.js, and a
   .js with ESM syntax makes Node reparse the file and warn on every CI run. */
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join, relative, resolve } = require('node:path');

const ROOT = resolve(__dirname, '..', 'public', 'i18n');
const LOCALES = ['es', 'en'];

/* Flatten so 'table.showing' is comparable whether it is nested or not. */
const flatten = (value, prefix = '', out = {}) => {
	for (const [key, entry] of Object.entries(value)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (entry && typeof entry === 'object' && !Array.isArray(entry)) flatten(entry, path, out);
		else out[path] = entry;
	}
	return out;
};

const read = (file) => flatten(JSON.parse(readFileSync(file, 'utf8')));

/* Each directory under public/i18n is a lazily-loaded scope and is checked as
   its own bundle — a scope is exactly where drift hides, since a missing key
   there only shows up once that feature is opened. */
const bundles = () => {
	const groups = [{ name: 'root', dir: ROOT }];
	for (const entry of readdirSync(ROOT)) {
		const path = join(ROOT, entry);
		if (statSync(path).isDirectory()) groups.push({ name: entry, dir: path });
	}
	return groups;
};

const findings = [];
const counts = {};

for (const { name, dir } of bundles()) {
	const dictionaries = {};
	for (const locale of LOCALES) {
		const file = join(dir, `${locale}.json`);
		try {
			dictionaries[locale] = read(file);
		} catch (error) {
			findings.push({ bundle: name, key: '—', issue: `cannot read ${relative(ROOT, file)}` });
		}
	}
	if (Object.keys(dictionaries).length !== LOCALES.length) continue;

	const [a, b] = LOCALES;
	counts[name] = Object.fromEntries(LOCALES.map((l) => [l, Object.keys(dictionaries[l]).length]));

	for (const key of Object.keys(dictionaries[a])) {
		if (!(key in dictionaries[b])) findings.push({ bundle: name, key, issue: `missing in ${b}` });
	}
	for (const key of Object.keys(dictionaries[b])) {
		if (!(key in dictionaries[a])) findings.push({ bundle: name, key, issue: `missing in ${a}` });
	}
	for (const locale of LOCALES) {
		for (const [key, value] of Object.entries(dictionaries[locale])) {
			if (!String(value ?? '').trim()) findings.push({ bundle: name, key, issue: `empty in ${locale}` });
		}
	}
}

for (const [bundle, per] of Object.entries(counts)) {
	console.log(`${bundle}: ${LOCALES.map((l) => `${l} ${per[l]}`).join(' · ')}`);
}

if (!findings.length) {
	console.log('\ni18n OK — every bundle matches across locales, no empty values.');
	process.exit(0);
}

console.error(`\n${findings.length} finding${findings.length === 1 ? '' : 's'}:`);
for (const { bundle, key, issue } of findings) console.error(`  [${bundle}] ${key} — ${issue}`);
process.exit(1);
