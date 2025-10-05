#!/usr/bin/env tsx
/**
 * i18nFillDe.ts
 * Step D1: Populate missing German narrative keys with placeholders.
 * Prefixes every inserted value with '__TODO__ ' for easy search.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const enPath = path.join(root, 'src/i18n/locales/en.json');
const dePath = path.join(root, 'src/i18n/locales/de.json');

type Locale = any;

const load = (p:string):Locale => JSON.parse(fs.readFileSync(p,'utf8'));
const save = (p:string,obj:any) => fs.writeFileSync(p, JSON.stringify(obj,null,2)+'\n');

const TARGET_SECTIONS = [
  'songContent.summaries',
  'songContent.accessIdeas',
  'songContent.visualCues',
  'songContent.themeDetail'
];

function get(obj:any, pathStr:string) {
  return pathStr.split('.').reduce((o,p)=> (o&&p in o)? o[p]: undefined, obj);
}
function ensure(obj:any, pathStr:string) {
  return pathStr.split('.').reduce((o,p)=> { if(!(p in o)) o[p] = {}; return o[p]; }, obj);
}

function main(){
  const en = load(enPath);
  const de = load(dePath);
  let added = 0;
  for (const section of TARGET_SECTIONS){
    const enSec = get(en, section) || {};
    const deSec = ensure(de, section);
    for (const k of Object.keys(enSec)) {
      if (!(k in deSec) || !deSec[k]) {
        deSec[k] = `__TODO__ ${enSec[k]}`;
        added++;
      }
    }
  }
  if (added){
    save(dePath, de);
    console.log(`i18nFillDe: Added ${added} German placeholder keys.`);
  } else {
    console.log('i18nFillDe: No new German keys needed.');
  }
}

main();