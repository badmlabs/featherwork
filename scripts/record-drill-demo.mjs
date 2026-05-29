import { chromium, devices } from 'playwright';
import { mkdir, readdir, stat } from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const ARTIFACT_DIR = '/opt/cursor/artifacts';
const VIDEO_DIR = path.join(ARTIFACT_DIR, 'drill-demo-videos');
const OUTPUT_MP4 = path.join(ARTIFACT_DIR, 'badminton-drill-steps-demo.mp4');
const WORKSPACE_MP4 = '/workspace/demo/badminton-drill-steps-demo.mp4';
const BASE = process.env.DEMO_URL || 'http://localhost:8081';

await mkdir(VIDEO_DIR, { recursive: true });
await mkdir(path.dirname(WORKSPACE_MP4), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices['Pixel 5'],
  viewport: { width: 430, height: 932 },
  recordVideo: { dir: VIDEO_DIR, size: { width: 430, height: 932 } },
});
const page = await context.newPage();
const wait = (ms) => page.waitForTimeout(ms);
page.on('dialog', async (d) => await d.accept());

async function clickStepsButton() {
  const label = page.getByText('Steps', { exact: true });
  const box = await label.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + 35);
  await wait(2200);
}

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 120000 });
await wait(3500);

// Brief peek at step 1
await clickStepsButton();
await page.getByText('Drill steps').waitFor();
await wait(1500);
await page.keyboard.press('Escape');
await wait(800);

// Add 3 moves (4 steps total with initial)
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => globalThis.__demoAddCourtStep?.());
  await wait(1500);
}

await clickStepsButton();
await page.getByText('Drill steps').waitFor();
const stepItems = page.getByText(/^Step \d+/);
const n = await stepItems.count();

await page.locator('input').first().fill('Smash drill');
await wait(1000);

await page.getByText(/Link includes all/).waitFor({ timeout: 10000 });
await wait(1500);

await stepItems.nth(1).click();
await wait(1200);
if (n >= 4) await stepItems.nth(3).click();
await wait(1500);

await page.getByRole('button', { name: 'Share link' }).click({ force: true });
await wait(4500);
await wait(1000);

await page.close();
await context.close();
await browser.close();

let best = '', bestSize = 0;
for (const f of await readdir(VIDEO_DIR)) {
  if (!f.endsWith('.webm')) continue;
  const sz = (await stat(path.join(VIDEO_DIR, f))).size;
  if (sz > bestSize) { bestSize = sz; best = f; }
}
execSync(`ffmpeg -y -i "${path.join(VIDEO_DIR, best)}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${OUTPUT_MP4}"`, { stdio: 'inherit' });
execSync(`cp "${OUTPUT_MP4}" "${WORKSPACE_MP4}"`);
console.log(`Saved ${OUTPUT_MP4} steps=${n} size=${bestSize}`);
