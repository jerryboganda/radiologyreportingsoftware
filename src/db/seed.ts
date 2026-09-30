import { db } from './index';
import { reports } from './schema';
import crypto from 'node:crypto';

async function seed() {
  const existing = await db.select().from(reports);
  if (existing.length > 0) {
    console.log('Database already has records:', existing.length);
    return;
  }

  console.log('Seeding initial GMCTH clinical reports into SQLite...');

  // Case 1: Ahmad 7251 (Complex Biliary Stent Malposition)
  await db.insert(reports).values({
    id: crypto.randomUUID(),
    tokenNumber: '7251',
    patientName: 'Ahmad',
    age: '64 Y',
    gender: 'Male',
    mrNumber: 'MR-7251',
    modality: 'Contrast-enhanced CT of the Abdomen and Pelvis with IV Contrast',
    studyDate: '12-Sep-2026',
    reportingDate: '12-Sep-2026',
    referringClinician: 'Surgical Ward / Gastroenterology',
    clinicalHistory: 'Known case of choledocholithiasis post-ERCP stenting. Presented with acute right upper quadrant pain and localized peritonism.',
    comparison: 'No previous imaging available for baseline comparison.',
    technique: 'Contrast-enhanced CT of the abdomen and pelvis was performed with multiplanar reformations following intravenous contrast administration.',
    findingsJson: JSON.stringify([
      {
        title: 'Lower Thorax & Basal Lungs',
        items: [
          { structure: 'Basal Lung Parenchyma', content: 'Visualised lung bases are clear with no consolidation, mass lesion, or pleural effusion bilaterally.', isAbnormal: false }
        ]
      },
      {
        title: 'Hepatobiliary Tree & Stent Evaluation',
        items: [
          { structure: 'Liver Parenchyma', content: 'Normal in size and overall attenuation with no evidence of focal space-occupying lesion or intrahepatic metastasis.', isAbnormal: false },
          { structure: 'Biliary Tree & Stent', content: 'A common bile duct (CBD) stent is in situ; its proximal end extends/migrates into the hepatic parenchyma, while the distal end is situated in the second part of the duodenum with localized extraluminal air extending up to the serosa, concerning for stent malposition with duodenal mural breach.', isAbnormal: true },
          { structure: 'Duct Calibre', content: 'The proximal common bile duct is mildly prominent measuring approximately 8.4 mm in diameter; the distal CBD measures 6.0 mm.', isAbnormal: true },
          { structure: 'Gallbladder', content: 'Normal in distension and wall thickness with no radio-opaque calculus or pericholecystic collection.', isAbnormal: false }
        ]
      },
      {
        title: 'Pancreas & Spleen',
        items: [
          { structure: 'Pancreas', content: 'Normal in size, lobulation, and enhancement. The main pancreatic duct is non-dilated. Peripancreatic fat planes are preserved.', isAbnormal: false },
          { structure: 'Spleen', content: 'Normal in size and parenchymal attenuation with no focal splenic lesion.', isAbnormal: false }
        ]
      },
      {
        title: 'Urinary Tract & Adrenals',
        items: [
          { structure: 'Adrenal Glands', content: 'Bilateral adrenal glands demonstrate normal limb morphology and thickness with no adenoma.', isAbnormal: false },
          { structure: 'Kidneys & Ureters', content: 'Both kidneys are normal in size, position, and nephrographic enhancement. Corticomedullary differentiation is preserved. No calculus, hydronephrosis, or focal renal lesion bilaterally. Ureters are non-dilated.', isAbnormal: false },
          { structure: 'Urinary Bladder', content: 'Well distended with thin, smooth wall and no intraluminal filling defect or calculus.', isAbnormal: false }
        ]
      },
      {
        title: 'Gastrointestinal Tract & Peritoneum',
        items: [
          { structure: 'Duodenum & Small Bowel', content: 'Localized extraluminal gas focus adjacent to the second part of the duodenum adjacent to the stent tip. No evidence of diffuse pneumoperitoneum or large bowel obstruction.', isAbnormal: true },
          { structure: 'Peritoneum & Ascites', content: 'No free intraperitoneal fluid, collection, or loculated abscess identified in the abdomen or pelvis.', isAbnormal: false },
          { structure: 'Lymph Nodes', content: 'A few subcentimeter reactive mesenteric lymph nodes are noted, non-enlarged by standard CT criteria.', isAbnormal: false },
          { structure: 'Vascular Structures', content: 'Abdominal aorta, inferior vena cava, celiac axis, and superior mesenteric vessels demonstrate normal caliber and patent flow.', isAbnormal: false }
        ]
      }
    ]),
    findingsMarkdown: 'Detailed findings as structured above.',
    impressionMarkdown: '1. Common bile duct stent in situ with proximal parenchymal migration and distal extension in the second part of the duodenum with localized extraluminal gas, concerning for stent malposition with duodenal mural breach.\n2. Mild dilatation of proximal CBD (8.4 mm).\n3. No diffuse pneumoperitoneum or gross free intraperitoneal fluid.\n4. Urgent communication of these findings to the treating surgical and gastroenterological team is advised.',
    recommendationsMarkdown: 'Immediate surgical and gastroenterological consultation is strongly recommended for urgent evaluation, stent retrieval/repositioning, and management of localized duodenal breach.',
    isUrgent: true,
    urgentCallLog: 'Urgent critical notification verbally communicated to General Surgery Registrar on duty at 02:45 PM on 12-Sep-2026 by Radiology Registrar. Read-back confirmed.',
    imagePath: '/assets/sample_note.png',
    verbatimTranscription: 'Ahmad 64 Y / male CT 7251\nCECT Abd + Pelvis\nCBD stent in situ -> prox end migrated in liver parench\ndistal end in D2 c local mural air / breach\nprox CBD 8.4mm, distal 6mm\nrest abd organs NAD, no FF, no gross pneumoperitoneum\nImp: CBD stent migration / D2 breach\nAdv: Urgent surgical review',
    verificationSheetMarkdown: 'STATUS: READY\nA. HEADER VARIABLES: Name: Ahmad, Age: 64 Y, Gender: Male, Token: #7251, Date: 12-Sep-2026\nB. VERBATIM TRANSCRIPTION: Line-by-line fidelity verified against handwritten note.\nC. FINDING LEDGER: Stent migration, proximal CBD 8.4 mm, local duodenal air.\nD. READING DECISIONS: Expanded D2 to second part of duodenum.\nE. AI-SYNTHESISED TEXT: Standard qualitative normals populated per Rule S3.\nF. NEGATIVES TO CONFIRM: No gross pneumoperitoneum; portal vein patent; kidneys normal.\nG. AUDIT STATUS: PASS',
    auditStatus: 'PASS',
    status: 'REVIEWED',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Case 2: Farwa 7057 (Thoracic Septal Thickening)
  await db.insert(reports).values({
    id: crypto.randomUUID(),
    tokenNumber: '7057',
    patientName: 'Farwa',
    age: '37 Years',
    gender: 'Female',
    mrNumber: 'MR-7057',
    modality: 'High-Resolution Computed Tomography (HRCT) of the Chest',
    studyDate: '03-Sep-2026',
    reportingDate: '03-Sep-2026',
    referringClinician: 'Pulmonology OPD',
    clinicalHistory: 'Chronic dry cough and mild exertional dyspnea. Evaluation for interstitial lung disease.',
    comparison: 'No previous imaging available for comparison.',
    technique: 'High-resolution volumetric thin-collimation (1.0 mm) non-contrast CT of the chest was performed in full inspiration with lung and mediastinal reformations.',
    findingsJson: JSON.stringify([
      {
        title: 'Tracheobronchial Tree & Airways',
        items: [
          { structure: 'Trachea & Central Bronchi', content: 'The trachea and main bronchi are normal in caliber and patent with no intraluminal lesion or tracheomalacia.', isAbnormal: false }
        ]
      },
      {
        title: 'Pulmonary Parenchyma',
        items: [
          { structure: 'Right Middle Lobe', content: 'Focal mild interlobular septal thickening is noted in the right middle lobe without consolidation or cavitation, likely representing post-inflammatory change.', isAbnormal: true },
          { structure: 'Bilateral Lung Fields', content: 'Remainder of bilateral upper, middle, and lower lobes are clear with no reticulation, honeycombing, traction bronchiectasis, or architectural distortion.', isAbnormal: false }
        ]
      },
      {
        title: 'Pleura & Mediastinum',
        items: [
          { structure: 'Pleural Spaces', content: 'No pleural effusion or pneumothorax on either side.', isAbnormal: false },
          { structure: 'Mediastinal & Hilar Nodes', content: 'A few subcentimeter precarinal lymph nodes are noted, non-enlarged by CT size criteria, likely reactive.', isAbnormal: false },
          { structure: 'Cardiovascular Structures', content: 'Heart is normal in size. Main pulmonary artery diameter is within normal limits (23.5 mm).', isAbnormal: false }
        ]
      }
    ]),
    findingsMarkdown: 'Detailed thoracic findings.',
    impressionMarkdown: '1. Focal mild right middle lobe interlobular septal thickening without architectural distortion or honeycombing, likely representing localized post-inflammatory changes.\n2. Subcentimeter reactive mediastinal lymph nodes.\n3. No CT evidence of usual interstitial pneumonia (UIP) or active pulmonary consolidation.',
    recommendationsMarkdown: 'Clinical correlation with pulmonary function tests (PFTs) is advised; routine follow-up as clinically indicated.',
    isUrgent: false,
    urgentCallLog: null,
    imagePath: '/assets/sample_note.png',
    verbatimTranscription: 'Farwa 37 Y / F CT 7057\nHRCT Chest\nFocal RML septal thickening\nsubcm precarinal LN\nrest lungs clear, no effusion\nImp: Focal RML septal thickening s/o post-inflammatory',
    verificationSheetMarkdown: 'STATUS: READY\nA. HEADER VARIABLES: Name: Farwa, Age: 37 Y, Token: #7057\nB. FINDING LEDGER: RML septal thickening, subcm LN\nC. AUDIT STATUS: PASS',
    auditStatus: 'PASS',
    status: 'FINALIZED',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Seeding completed successfully!');
}

seed().catch(console.error);
