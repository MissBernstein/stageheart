#!/usr/bin/env tsx
/**
 * Safe image optimization script.
 * - Supports PNG only (can be extended)
 * - Generates WebP next to original (filename.webp)
 * - PRESERVES transparency (webp lossless + alpha)
 * - Skips writing if WebP is not smaller
 * - Provides --apply flag; otherwise dry-run only
 * - Provides --quality (default 90) and --min-savings (default 5%)
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

interface Result { file: string; original: number; webp?: number; saved?: number; keptPng?: boolean; written?: boolean; skipped?: string; }

const ROOT = path.resolve(process.cwd(), 'src/assets');
const APPLY = process.argv.includes('--apply');
const QUALITY_ARG = process.argv.find(a => a.startsWith('--quality='));
const MIN_SAVINGS_ARG = process.argv.find(a => a.startsWith('--min-savings='));
const QUALITY = QUALITY_ARG ? parseInt(QUALITY_ARG.split('=')[1], 10) : 90; // high quality
const MIN_SAVINGS = MIN_SAVINGS_ARG ? parseFloat(MIN_SAVINGS_ARG.split('=')[1]) : 5; // percent

const isPng = (f: string) => f.toLowerCase().endsWith('.png');

const walk = (dir: string, list: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, list); else list.push(full);
  }
  return list;
};

(async () => {
  if (!fs.existsSync(ROOT)) {
    console.error('Assets directory not found:', ROOT);
    process.exit(1);
  }

  const files = walk(ROOT).filter(isPng);
  if (!files.length) {
    console.log('No PNG files found.');
    return;
  }

  const results: Result[] = [];
  for (const file of files) {
    try {
      const buf = fs.readFileSync(file);
      const originalSize = buf.length;
      const outPath = file.replace(/\.png$/i, '.webp');

      // Use lossless for transparency + high quality; sharp auto-preserves alpha.
      const webpBuffer = await sharp(buf, { failOn: 'none' })
        .webp({ quality: QUALITY, lossless: true })
        .toBuffer();

      const webpSize = webpBuffer.length;
      const saved = ((originalSize - webpSize) / originalSize) * 100;

      if (!APPLY) {
        results.push({ file, original: originalSize, webp: webpSize, saved, skipped: saved < MIN_SAVINGS ? 'below threshold' : undefined });
        continue;
      }

      if (saved < MIN_SAVINGS) {
        results.push({ file, original: originalSize, webp: webpSize, saved, skipped: 'below threshold' });
        continue; // keep original only
      }

      // Write side-by-side; do NOT delete original.
      fs.writeFileSync(outPath, webpBuffer);
      results.push({ file, original: originalSize, webp: webpSize, saved, written: true });
    } catch (err) {
      console.error('Error processing', file, err);
    }
  }

  // Reporting
  const fmt = (n?: number) => n != null ? (n / 1024).toFixed(1) + ' kB' : '-';
  console.log(`\nImage optimization ${APPLY ? 'APPLY' : 'DRY-RUN'} report (threshold ${MIN_SAVINGS}% savings)`);
  let totalBefore = 0, totalAfter = 0, totalWritten = 0;
  for (const r of results) {
    totalBefore += r.original;
    if (r.webp && r.saved && r.saved >= MIN_SAVINGS) {
      totalAfter += r.webp;
      if (r.written) totalWritten += 1;
    } else {
      totalAfter += r.original; // unchanged
    }
    const status = r.written ? 'written' : (r.skipped ? `skipped:${r.skipped}` : 'analyzed');
    console.log(`${status.padEnd(16)} ${path.basename(r.file).padEnd(28)} orig=${fmt(r.original)} webp=${fmt(r.webp)} savings=${r.saved?.toFixed(1) ?? '-'}%`);
  }
  const overallSavings = ((totalBefore - totalAfter) / totalBefore) * 100;
  console.log(`\nTotal before: ${fmt(totalBefore)} after: ${fmt(totalAfter)} potential savings: ${overallSavings.toFixed(1)}% (files written: ${totalWritten})`);
  if (!APPLY) {
    console.log('\nRun with: npm run optimize:images -- --apply  (add optional --quality=95 --min-savings=3)');
  }
})();
