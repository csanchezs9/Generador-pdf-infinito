const { chromium } = require('playwright');
const path = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Documents-Generador-pdf-infinito/839ff5c4-11a3-4e32-8c27-e339c4902d18/scratchpad/oreja.pdf';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 1131 } });
  for (const n of [12, 13]) {
    await page.goto(`file:///${path}#page=${n}&zoom=70`, { waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: `C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Documents-Generador-pdf-infinito/839ff5c4-11a3-4e32-8c27-e339c4902d18/scratchpad/oreja-p${n}.png` });
  }
  await browser.close();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
