'use strict';

/**
 * Shared CSV reader/writer for Anagnosis.
 *
 * Every script that crosses a layer boundary (csvs/ → derived/ → data/) must
 * read and write CSV through this module, so all readers agree on quoting,
 * line endings, and header handling.
 *
 * Dialect: RFC 4180. Fields containing a comma, double quote, or newline are
 * quoted; embedded quotes are doubled. Input may use CRLF or LF; output is
 * always LF with a trailing newline.
 */

const fs = require('fs');

/**
 * Parse CSV text into an array of row objects keyed by header.
 * Blank lines are skipped. Missing trailing fields become ''.
 */
function parse(text) {
  const rows = parseRows(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (values.length === 1 && values[0] === '') continue; // blank line
    const row = {};
    headers.forEach((h, j) => { row[h] = values[j] ?? ''; });
    out.push(row);
  }
  return out;
}

/** Parse CSV text into an array of string arrays (header row included). */
function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/** Return the header row of a CSV text. */
function headersOf(text) {
  return (parseRows(text)[0] || []).map(h => h.trim());
}

function escapeField(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Serialize row objects to CSV text.
 * `headers` fixes the column order; defaults to the keys of the first row.
 */
function stringify(rows, headers) {
  const cols = headers || (rows.length ? Object.keys(rows[0]) : []);
  const lines = [cols.map(escapeField).join(',')];
  for (const row of rows) lines.push(cols.map(c => escapeField(row[c])).join(','));
  return lines.join('\n') + '\n';
}

function readFile(filePath) {
  return parse(fs.readFileSync(filePath, 'utf8'));
}

function writeFile(filePath, rows, headers) {
  fs.writeFileSync(filePath, stringify(rows, headers), 'utf8');
}

/** Split a pipe-delimited list field into trimmed non-empty strings. */
function splitPipe(value) {
  return value ? String(value).split('|').map(s => s.trim()).filter(Boolean) : [];
}

/** Parse an integer field; '' or non-numeric → null. */
function toInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

/** Parse a boolean field written as 1/0 or true/false. */
function toBool(value) {
  return value === '1' || value === 'true' || value === true;
}

module.exports = { parse, parseRows, headersOf, stringify, readFile, writeFile, splitPipe, toInt, toBool };
