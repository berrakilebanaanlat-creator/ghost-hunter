import { ALL_WORDS } from '../lib/word-bank';
import * as fs from 'fs';

// Read the pasted content and extract words
const raw = fs.readFileSync('/home/ubuntu/upload/pasted_content.txt', 'utf-8');
// Extract all quoted strings
const matches = raw.match(/"([^"]+)"/g);
const newWords = matches ? matches.map(m => m.replace(/"/g, '').trim()).filter(w => w.length > 0) : [];

const existing = new Set(ALL_WORDS.map(w => w.toLowerCase()));
const unique = newWords.filter(w => !existing.has(w.toLowerCase()));
const dupes = newWords.filter(w => existing.has(w.toLowerCase()));

console.log("Toplam mevcut:", ALL_WORDS.length);
console.log("Yeni kelime sayısı:", newWords.length);
console.log("Zaten var (çakışan):", dupes.length);
console.log("Eklenecek (benzersiz):", unique.length);
console.log("\nBenzersiz kelimeler:", JSON.stringify(unique, null, 2));
