const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function generateSampleNote() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (!fs.existsSync(chromePath)) {
    console.error('Chrome executable not found at:', chromePath);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@400;700&family=Inter:wght@400;700;800&family=Shadows+Into+Light&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #e2e8f0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 30px;
      font-family: 'Caveat', cursive;
    }
    .sheet {
      width: 780px;
      background: #fdfbf7;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(15, 23, 42, 0.12);
      border-radius: 6px;
      padding: 38px 46px 48px 46px;
      position: relative;
      background-image: 
        linear-gradient(rgba(180, 205, 237, 0.45) 1px, transparent 1px);
      background-size: 100% 34px;
      background-position: 0 148px;
      border-left: 3px solid #f87171;
    }
    .margin-line {
      position: absolute;
      left: 62px;
      top: 0;
      bottom: 0;
      width: 1.5px;
      background: rgba(239, 68, 68, 0.4);
    }
    .clip {
      position: absolute;
      top: -12px;
      right: 50px;
      width: 28px;
      height: 64px;
      border: 3.5px solid #64748b;
      border-radius: 10px;
      box-shadow: 2px 4px 6px rgba(0,0,0,0.2);
      z-index: 10;
    }
    .header {
      font-family: 'Inter', sans-serif;
      border-bottom: 2px solid #0f2c59;
      padding-bottom: 12px;
      margin-bottom: 22px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .hospital-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f2c59;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .hospital-sub {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
    }
    .badge {
      font-size: 10px;
      font-weight: 800;
      background: #0f2c59;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .handwriting {
      color: #1e3a8a; /* Medical ballpoint blue */
      font-size: 26px;
      line-height: 34px;
      letter-spacing: 0.2px;
      text-shadow: 0.2px 0.2px 0.5px rgba(30, 58, 138, 0.4);
    }
    .patient-line {
      font-size: 27px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1.5px dashed #94a3b8;
      padding-bottom: 6px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .token-stamp {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 800;
      color: #b91c1c;
      border: 2px solid #b91c1c;
      padding: 3px 10px;
      border-radius: 4px;
      transform: rotate(-2deg);
      display: inline-block;
      background: rgba(254, 242, 242, 0.8);
    }
    .modality-line {
      font-size: 25px;
      font-weight: 700;
      color: #1d4ed8;
      margin-bottom: 14px;
    }
    .finding-item {
      margin-bottom: 10px;
      padding-left: 20px;
      position: relative;
    }
    .finding-item::before {
      content: "-";
      position: absolute;
      left: 4px;
      font-weight: bold;
    }
    .highlight {
      background: rgba(254, 240, 138, 0.7);
      padding: 0 4px;
      border-radius: 2px;
    }
    .imp-box {
      margin-top: 22px;
      border: 2px solid #2563eb;
      border-radius: 6px;
      padding: 14px 18px;
      background: rgba(239, 246, 255, 0.75);
    }
    .imp-title {
      font-weight: 700;
      font-size: 26px;
      color: #1d4ed8;
      text-decoration: underline;
      margin-bottom: 6px;
    }
    .adv-title {
      font-weight: 700;
      font-size: 25px;
      color: #b91c1c;
      margin-top: 10px;
    }
    .sig {
      margin-top: 26px;
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      gap: 20px;
    }
    .sig-line {
      text-align: center;
      font-family: 'Kalam', cursive;
      color: #1e3a8a;
      font-size: 22px;
    }
    .doc-stamp {
      font-family: 'Inter', sans-serif;
      font-size: 9px;
      color: #475569;
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      text-transform: uppercase;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="clip"></div>
    <div class="margin-line"></div>
    
    <div class="header">
      <div>
        <div class="hospital-title">GUJRANWALA TEACHING HOSPITAL (GMCTH)</div>
        <div class="hospital-sub">Department of Diagnostic Radiology — CT Scan Section</div>
      </div>
      <div>
        <span class="badge">CONSULTANT ROUGH FINDINGS NOTE</span>
      </div>
    </div>

    <div class="patient-line handwriting">
      <span>Pt: Ahmad, 64 Y / Male</span>
      <span class="token-stamp">CT TOKEN #7251</span>
    </div>

    <div class="handwriting">
      <div class="modality-line">Study: CECT Abd + Pelvis (12-Sep-2026)</div>
      
      <div class="finding-item">
        CBD stent in situ &rarr; prox end <span class="highlight">migrated in liver parench</span>
      </div>
      
      <div class="finding-item">
        distal end in D2 c̄ local mural air / breach (urgent)
      </div>

      <div class="finding-item">
        prox CBD 8.4 mm, distal 6.0 mm
      </div>

      <div class="finding-item">
        rest abd organs NAD, no FF, no gross pneumoperitoneum
      </div>

      <div class="finding-item">
        lungs base clear, kidneys normal bilat.
      </div>

      <div class="imp-box">
        <div class="imp-title">Impression:</div>
        <div>1. CBD stent proximal hepatic migration c̄ distal D2 duodenal mural breach.</div>
        <div>2. Prominent proximal CBD (8.4 mm).</div>
        <div class="adv-title">Adv: URGENT surgical / gastro review & stent retrieval!</div>
      </div>

      <div class="sig">
        <div class="sig-line">
          <em>Dr. Tariq (Senior Cons.)</em>
          <div class="doc-stamp">Senior Consultant Radiologist — GMCTH</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const element = await page.$('.sheet');
  const buffer = await element.screenshot({ type: 'png' });

  const publicAssetsDir = path.resolve(__dirname, '../public/assets');
  const distAssetsDir = path.resolve(__dirname, '../dist/client/assets');
  const uploadsDir = path.resolve(__dirname, '../uploads');

  [publicAssetsDir, distAssetsDir, uploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  fs.writeFileSync(path.join(publicAssetsDir, 'sample_note.png'), buffer);
  fs.writeFileSync(path.join(distAssetsDir, 'sample_note.png'), buffer);
  fs.writeFileSync(path.join(uploadsDir, 'sample_note.png'), buffer);

  console.log('Successfully generated sample_note.png in public/assets, dist/client/assets, and uploads!');
  await browser.close();
}

generateSampleNote().catch(err => {
  console.error('Error generating sample note:', err);
  process.exit(1);
});
