// Çalıştır: node test.js
const assert = require('assert');
const fs = require('fs');
const { analyze, tips, formatTime } = require('./sifre.js');

// Sayfadaki örnek kartları, ölçerin verdiği sonuçla çelişmemeli.
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const examples = [...html.matchAll(/data-try="([^"]+)" data-expect="(weak|strong)"/g)];
assert.ok(examples.length >= 6, 'örnek kartlar bulunamadı');
for (const [, pw, expect] of examples) {
  const r = analyze(pw.replace(/&amp;/g, '&'));
  console.log(pw.padEnd(32), r.level, r.bits.toFixed(1), formatTime(r.seconds));
  if (expect === 'weak') assert.ok(r.level <= 1, pw + ' zayıf görünmeli');
  else assert.ok(r.level >= 3, pw + ' güçlü görünmeli');
}

assert.strictEqual(analyze(''), null);
assert.ok(analyze('P@ssw0rd').common && analyze('P@ssw0rd').leet);
assert.deepStrictEqual(analyze('ayse2010').years, ['2010']);
assert.ok(analyze('İstanbul').common, 'Türkçe büyük İ normalize edilmeli');
assert.ok(analyze('abcdef').sequences.length && analyze('aaaaaa').repeats.length);
assert.ok(analyze('x'.repeat(128)).seconds < 1, 'tekrar eden uzun şifre zayıf olmalı');
assert.ok(isFinite(analyze('Zq7!'.repeat(32)).bits));
assert.ok(tips(analyze('123456')).length > 0);
console.log('OK');
