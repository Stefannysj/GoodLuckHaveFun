/* Comparacion visual opcional. Solo Node.js + Chromium/Chrome/Edge.
 * Uso: node tests/visual-compare.mjs URL_ORIGINAL URL_LOCAL
 * Captura 375 y 1280 px, produce reporte e imagenes sin alterar la web. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';

const [original = 'https://stefannysj.github.io/GoodLuckHaveFun/', candidate = 'http://localhost:8080/'] = process.argv.slice(2);
const out = path.resolve('artifacts/visual');
fs.mkdirSync(out, { recursive: true });
const paths = [process.env.CHROME_PATH, 'chromium', 'chromium-browser', 'google-chrome', 'chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
const browser = paths.find(p => spawnSync(p, ['--version'], { encoding: 'utf8' }).status === 0);
if (!browser) {
  console.error('No se encontro Chromium, Google Chrome ni Microsoft Edge. Define CHROME_PATH.');
  process.exit(2);
}
const pngMagic = Buffer.from([137,80,78,71,13,10,26,10]);
const image = data => {
  if (!data.subarray(0,8).equals(pngMagic)) throw new Error('El archivo no es PNG.');
  let offset=8, width=0, height=0, depth=0, color=0, chunks=[];
  while (offset + 12 <= data.length) {
    const n=data.readUInt32BE(offset); const tag=data.toString('ascii',offset+4,offset+8);
    const item=data.subarray(offset+8,offset+8+n);offset+=n+12;
    if (tag==='IHDR') {width=item.readUInt32BE(0);height=item.readUInt32BE(4);depth=item[8];color=item[9];}
    if (tag==='IDAT') chunks.push(item);
    if (tag==='IEND') break;
  }
  if (depth!==8 || ![2,6].includes(color)) throw new Error(`PNG no admitido (profundidad=${depth}, color=${color}).`);
  const channels=color===6?4:3, stride=width*channels, raw=zlib.inflateSync(Buffer.concat(chunks));
  const pixels=Buffer.alloc(width*height*4);
  let at=0, prev=Buffer.alloc(stride);
  for(let y=0;y<height;y++) {
    const mode=raw[at++],row=Buffer.from(raw.subarray(at,at+stride)); at+=stride;
    for(let i=0;i<stride;i++) {
      const a=i<channels?0:row[i-channels], b=prev[i], c=i<channels?0:prev[i-channels];
      let p=0;
      if(mode===1) p=a;
      else if(mode===2) p=b;
      else if(mode===3) p=Math.floor((a+b)/2);
      else if(mode===4) {
        const x=a+b-c,da=Math.abs(x-a),db=Math.abs(x-b),dc=Math.abs(x-c);
        p=da<=db && da<=dc?a:(db<=dc?b:c);
      } else if(mode!==0) throw new Error(`Filtro PNG desconocido ${mode}`);
      row[i]=(row[i]+p)&255;
    }
    for(let x=0;x<width;x++) {
      const s=x*channels,d=(y*width+x)*4;
      pixels[d]=row[s];pixels[d+1]=row[s+1];pixels[d+2]=row[s+2];pixels[d+3]=channels===4?row[s+3]:255;
    }
    prev=row;
  }
  return {width,height,pixels};
};
const capture=(url,w,kind)=>{
  const file=path.join(out,`${kind}-${w}.png`);
  const options=['--headless','--no-first-run','--no-default-browser-check','--disable-gpu',
    '--hide-scrollbars','--force-device-scale-factor=1','--virtual-time-budget=6000',
    `--window-size=${w},900`,`--screenshot=${file}`,url];
  if(process.platform!=='win32')options.unshift('--no-sandbox');
  const run=spawnSync(browser, options,{encoding:'utf8',timeout:45000,maxBuffer:2*1024*1024});
  if(!fs.existsSync(file)||run.status!==0)throw new Error(`Captura ${kind} (${w}px) fallida: ${(run.stderr||'').slice(-600)}`);
  return file;
};
let report=[];
for (const w of [375,1280]) {
  const left=capture(original,w,'original'),right=capture(candidate,w,'nuevo');
  const a=image(fs.readFileSync(left)),b=image(fs.readFileSync(right));
  const width=Math.min(a.width,b.width),height=Math.min(a.height,b.height);
  let different=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const ai=(y*a.width+x)*4,bi=(y*b.width+x)*4;
    if(Math.max(...[0,1,2].map(k=>Math.abs(a.pixels[ai+k]-b.pixels[bi+k])))>18)different++;
  }
  const ratio=100*different/(width*height);
  const result={viewport:w,originalSize:`${a.width}x${a.height}`,newSize:`${b.width}x${b.height}`,
    changedPixelsPercent:Number(ratio.toFixed(2)),pixelTolerance:18,
    note:'Se esperan diferencias de color (gris oscuro) y de noticias; revisar geometry, cortes y saltos.'};
  report.push(result);console.log(JSON.stringify(result));
}
fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(report,null,2)+'\n');
const comparisons=report.map(({viewport})=>`<section><h2>${viewport} px</h2><div class="pair"><figure><figcaption>Sitio publicado</figcaption><img src="original-${viewport}.png" alt="Antes" /></figure><figure><figcaption>Generador C#</figcaption><img src="nuevo-${viewport}.png" alt="Despues" /></figure></div></section>`).join('');
fs.writeFileSync(path.join(out,'comparacion.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><title>GLHF comparacion visual</title><style>body{background:#20242b;color:#fafafa;font:16px system-ui;padding:16px}.pair{display:flex;gap:16px;flex-wrap:wrap}.pair figure{margin:0;max-width:calc(50% - 16px)}.pair img{width:100%;object-fit:contain;object-position:top;border:1px solid #77818c}section{border-bottom:1px solid #556;padding:20px 0}</style><h1>Comparacion visual GLHF</h1><p>Diferencias cromaticas/editoriales solicitadas. Revisar desbordes y estructura.</p>${comparisons}</html>`);
console.log('Capturas y comparacion: artifacts/visual/comparacion.html');
