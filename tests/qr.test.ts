import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeQrMatrix,
  generateQrMatrix,
  encodeQrSvg,
  generateQrSvg,
  QrCode,
  QrEcc,
} from '../src/lib/qr.ts';
import { decodeSchedule, encodeSchedule } from '../src/lib/classcode.ts';
import { emptySchedule } from '../src/lib/model.ts';
import { setDay } from '../src/lib/schedule.ts';

test('qr: matriks QR code dan finder patterns valid', () => {
  const matrix = encodeQrMatrix('NOTED1-TEST');
  assert.ok(Array.isArray(matrix));
  assert.ok(matrix.length >= 21);
  assert.equal(matrix.length, matrix[0].length);

  const size = matrix.length;

  const checkFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const expected =
          r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        assert.equal(
          matrix[r0 + r][c0 + c],
          expected,
          `Finder pattern mismatch at row ${r0 + r}, col ${c0 + c}`
        );
      }
    }
  };

  checkFinder(0, 0);
  checkFinder(0, size - 7);
  checkFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    const expected = i % 2 === 0;
    assert.equal(matrix[6][i], expected);
    assert.equal(matrix[i][6], expected);
  }

  assert.deepEqual(generateQrMatrix('NOTED1-TEST'), matrix);
});

test('qr: styling SVG Noted retro (--ink dan --card)', () => {
  const svg = encodeQrSvg('NOTED1-TEST');

  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.trim().endsWith('</svg>'));
  assert.ok(svg.includes('shape-rendering="crispEdges"'));
  assert.ok(svg.includes('var(--card, #fffbf0)'));
  assert.ok(svg.includes('var(--ink, #111111)'));
  assert.ok(svg.includes('--card'));
  assert.ok(svg.includes('#fffbf0'));
  assert.ok(svg.includes('--ink'));
  assert.ok(svg.includes('#111111'));
  assert.ok(svg.includes('viewBox="0 0 29 29"'));
  assert.ok(svg.includes('<rect width="29" height="29"'));
  assert.ok(svg.includes('<path d="M'));

  const customSvg = encodeQrSvg('NOTED1-TEST', {
    border: 2,
    size: 240,
    fgColor: '#123456',
    bgColor: '#abcdef',
    modulesAs: 'rect',
  });

  assert.ok(customSvg.includes('viewBox="0 0 25 25"'));
  assert.ok(customSvg.includes('width="240" height="240"'));
  assert.ok(customSvg.includes('fill="#abcdef"'));
  assert.ok(customSvg.includes('fill="#123456"'));
  assert.ok(customSvg.includes('<rect x="'));
  assert.equal(generateQrSvg('NOTED1-TEST'), svg);
});

test('qr: integrasi dengan payload jadwal classcode NOTED1-...', () => {
  let s = emptySchedule();
  s = setDay(s, 1, ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'Fisika']);
  s = setDay(s, 2, ['Kimia', 'Biologi', 'Sejarah', 'Seni Budaya']);
  s = setDay(s, 3, ['Pendidikan Agama', 'PPKn', 'PJOK', 'Informatika']);
  s = setDay(s, 4, ['MTK TL', 'Sosiologi', 'Ekonomi', 'Geografi']);
  s = setDay(s, 5, ['Bimbingan Konseling', 'Prakarya']);

  const payload = encodeSchedule(s);
  assert.ok(payload.startsWith('NOTED1-'));

  const matrix = encodeQrMatrix(payload);
  assert.ok(matrix.length > 21);

  const svg = encodeQrSvg(payload);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.trim().endsWith('</svg>'));
  assert.ok(svg.includes('var(--card, #fffbf0)'));
  assert.ok(svg.includes('var(--ink, #111111)'));
});

test('qr: level error correction (L, M, Q, H)', () => {
  const levels = ['L', 'M', 'Q', 'H'] as const;
  for (const lvl of levels) {
    const matrix = encodeQrMatrix('NOTED1-TEST-ECC', lvl);
    assert.ok(matrix.length >= 21);
    const svg = encodeQrSvg('NOTED1-TEST-ECC', { ecc: lvl });
    assert.ok(svg.includes('<svg'));
  }

  const qr = QrCode.encodeText('NOTED1-TEST', QrEcc.HIGH);
  assert.equal(qr.errorCorrectionLevel, QrEcc.HIGH);
  assert.ok(qr.size >= 21);
  assert.equal(typeof qr.getModule(0, 0), 'boolean');
});

test('qr: validasi payload NOTED1-... dan pratinjau jadwal baru', () => {
  assert.equal(decodeSchedule('https://example.com/noted'), null);
  assert.equal(decodeSchedule('WIFI:S:MyWifi;T:WPA;P:secret;;'), null);
  assert.equal(decodeSchedule('RANDOM-CODE-12345'), null);
  assert.equal(decodeSchedule('NOTED2-ABCDEF'), null);
  assert.equal(decodeSchedule(''), null);

  let s = emptySchedule();
  s = setDay(s, 1, ['MTK', 'BIN']);
  s = setDay(s, 2, ['BIG', 'FIS', 'KIM']);
  const code = encodeSchedule(s);
  assert.ok(code.startsWith('NOTED1-'));

  const decoded = decodeSchedule(code);
  assert.notEqual(decoded, null);
  assert.deepEqual(decoded, s);

  const total = [1, 2, 3, 4, 5, 6].reduce((sum, d) => sum + (decoded![d]?.length ?? 0), 0);
  assert.equal(total, 5);
  assert.equal(decoded![1].length, 2);
  assert.equal(decoded![2].length, 3);
  assert.equal(decoded![3].length, 0);
});
