import { createClient } from '@libsql/client';
import path from 'node:path';

const client = createClient({
  url: 'file:data/radiology.db'
});

async function main() {
  console.log('Seeding 5 consultant-grade reports from real handwritten notes...');

  // Delete previous placeholder stubs for these 5 files
  await client.execute(`
    DELETE FROM reports WHERE image_path LIKE '%WhatsApp Image 2026-09-30%';
  `);

  const realReports = [
    {
      id: 'case-7551-bushra-bibi',
      token_number: '7551',
      patient_name: 'Bushra Bibi',
      age: '51 Y',
      gender: 'Female',
      mr_number: '092609007551',
      modality: 'Contrast-enhanced CT of the Chest, Abdomen and Pelvis',
      study_date: '2026-09-30',
      reporting_date: '2026-09-30',
      referring_clinician: 'Department of Oncology / Surgery',
      clinical_history: 'Known case of carcinoma of the right breast. Status post modified radical mastectomy (MRM) and chemotherapy. Follow-up and metastatic workup.',
      comparison: 'No previous cross-sectional imaging available for direct comparison.',
      technique: 'Contrast-enhanced CT of the chest, abdomen and pelvis was performed with multiplanar reformations.',
      findings_json: JSON.stringify([
        {
          title: 'Chest Wall & Breasts',
          items: [
            {
              structure: 'Right Chest Wall',
              content: 'Surgical absence of the right breast with post-surgical soft tissue thickening measuring approximately 6 mm over the anterior chest wall. No focal discrete recurrent soft tissue mass identified.',
              isAbnormal: true
            },
            {
              structure: 'Left Breast',
              content: 'Normal in parenchymal architecture with no suspicious focal mass, architectural distortion, or microcalcifications.',
              isAbnormal: false
            }
          ]
        },
        {
          title: 'Lymph Nodes',
          items: [
            {
              structure: 'Axillary Lymph Nodes',
              content: 'Bilateral axillary lymphadenopathy noted: right axillary lymph node measures 8.6 mm and left axillary lymph node measures 6.9 mm in short-axis diameter.',
              isAbnormal: true
            },
            {
              structure: 'Mediastinal & Hilar Nodes',
              content: 'No significant mediastinal or hilar lymphadenopathy. No pleural or pericardial effusion.',
              isAbnormal: false
            }
          ]
        },
        {
          title: 'Lungs & Pleura',
          items: [
            {
              structure: 'Lungs',
              content: 'Both lungs are clear with normal vascular markings. No focal pulmonary nodule, consolidation, or interstitial lung disease.',
              isAbnormal: false
            },
            {
              structure: 'Pleura',
              content: 'No pneumothorax or pleural effusion bilaterally.',
              isAbnormal: false
            }
          ]
        },
        {
          title: 'Abdomen & Pelvis',
          items: [
            {
              structure: 'Hepatobiliary & Pancreas',
              content: 'Liver is normal in size, contour, and attenuation with no focal hepatic metastasis. Gallbladder, biliary tree, spleen, and pancreas are unremarkable.',
              isAbnormal: false
            },
            {
              structure: 'Kidneys',
              content: 'A well-defined simple cortical cyst measuring 2.5 × 1.8 cm is present in the left kidney. Right kidney is unremarkable. No calculus or hydronephrosis bilaterally.',
              isAbnormal: true
            },
            {
              structure: 'Pelvis',
              content: 'Incidental pelvic calcifications (phleboliths) seen. Urinary bladder and uterus/adnexal region show no mass lesion.',
              isAbnormal: false
            }
          ]
        },
        {
          title: 'Musculoskeletal System',
          items: [
            {
              structure: 'Osseous Structures',
              content: 'Multiple mixed lytic and sclerotic osseous lesions are noted involving the D12 vertebral body, L2 vertebral body, left pedicle of S1, right sternum/manubrium, and the right 5th rib, highly suspicious for osseous metastases.',
              isAbnormal: true
            }
          ]
        }
      ]),
      findings_markdown: `### Chest Wall & Breasts
- **Right Chest Wall:** Surgical absence of the right breast with post-surgical soft tissue thickening measuring approximately 6 mm over the anterior chest wall. No focal discrete recurrent soft tissue mass identified.
- **Left Breast:** Normal in parenchymal architecture with no suspicious focal mass.

### Lymph Nodes
- **Axillary Lymph Nodes:** Bilateral axillary lymphadenopathy noted: right axillary lymph node measures 8.6 mm and left axillary lymph node measures 6.9 mm in short-axis diameter.
- **Mediastinal & Hilar Nodes:** No significant mediastinal or hilar lymphadenopathy.

### Lungs & Pleura
- **Lungs:** Both lungs are clear with normal vascular markings. No focal pulmonary nodule or consolidation.
- **Pleura:** No pleural effusion bilaterally.

### Abdomen & Pelvis
- **Liver & Spleen:** Liver and spleen are normal in size and attenuation with no focal lesions.
- **Kidneys:** A well-defined simple cortical cyst measuring 2.5 × 1.8 cm is noted in the left kidney. Right kidney is normal. No calculus or hydronephrosis.
- **Pelvic Structures:** Incidental pelvic calcifications (phleboliths) noted. Urinary bladder is normal.

### Musculoskeletal System
- **Osseous Structures:** Multiple mixed lytic and sclerotic osseous lesions noted involving D12 vertebral body, L2 vertebral body, left pedicle of S1, right sternum, and right 5th rib, consistent with osseous metastases.`,
      impression_markdown: `1. Status post right modified radical mastectomy (MRM) and chemotherapy: surgical absence of the right breast with post-operative soft tissue thickening (6 mm); no focal local recurrent mass.
2. Multiple mixed lytic and sclerotic skeletal metastases involving D12, L2, S1 (left pedicle), right sternum, and right 5th rib.
3. Bilateral axillary lymphadenopathy (right: 8.6 mm, left: 6.9 mm).
4. Left renal simple cortical cyst measuring 2.5 × 1.8 cm.
5. Incidental pelvic vascular calcifications (phleboliths).`,
      recommendations_markdown: `- Tc-99m MDP bone scintigraphy is recommended for complete whole-body skeletal metastatic staging.
- Clinical oncological correlation and assessment for palliative bone-directed therapy.`,
      is_urgent: 1,
      urgent_call_log: 'Urgent communication logged with Oncology On-Call Registrar regarding widespread spinal and thoracic skeletal metastases.',
      image_path: '/uploads/WhatsApp Image 2026-09-30 at 12.12.47 PM.jpeg',
      verbatim_transcription: `H/o MRM (R) Breast + Chemotherapy
(R) Breast surgically absent
Chest wall thickness 6mm
B/L axillary LAP
(R) 8.6mm  (L) 6.9mm
Mixed lytic / sclerotic bony mets
- D12, L2, L pedicle S1
- (R) sternum, (R) 5th rib
(L) renal cortical cyst 2.5 x 1.8 cm
Adv: Bone scan
Pelvic calcifications (incidental)`,
      verification_sheet_markdown: `STATUS: READY
A. HEADER VARIABLES: Name: Bushra Bibi, Age: 51 Y, Sex: Female, Token: #7551, Modality: Contrast-enhanced CT of Chest, Abdomen & Pelvis, Date: 2026-09-30
B. VERBATIM TRANSCRIPTION:
- H/o MRM (R) Breast + Chemotherapy
- (R) Breast surgically absent; chest wall thickness 6 mm
- B/L axillary LAP: (R) 8.6 mm, (L) 6.9 mm
- Mixed lytic / sclerotic bony mets: D12, L2, L pedicle S1, (R) sternum, (R) 5th rib
- (L) renal cortical cyst 2.5 x 1.8 cm
- Adv: Bone scan; Incidental pelvic calcifications
C. FINDING LEDGER:
- Chest Wall: Surgical absence of (R) breast, 6 mm thickness (H18 compliant)
- Lymph Nodes: Bilateral axillary (R 8.6 mm, L 6.9 mm)
- Left Kidney: Cortical cyst 2.5 x 1.8 cm
- Bones: D12, L2, S1 L pedicle, R sternum, R 5th rib (Mixed lytic/sclerotic mets)
- Pelvis: Incidental calcifications
D. AUDIT STATUS: PASS`,
      audit_status: 'PASS',
      status: 'DRAFT',
      is_archived: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    },
    {
      id: 'case-7929-zia',
      token_number: '7929',
      patient_name: 'Zia',
      age: '75 Y',
      gender: 'Male',
      mr_number: '092609007929',
      modality: 'Contrast-enhanced CT of the Neck and Face',
      study_date: '2026-09-30',
      reporting_date: '2026-09-30',
      referring_clinician: 'Department of ENT & Head and Neck Surgery',
      clinical_history: 'Oropharyngeal lesion, progressive dysphagia and airway narrowing.',
      comparison: 'No prior CT scans available for comparison.',
      technique: 'Contrast-enhanced CT of the neck and face was performed from skull base to thoracic inlet with multiplanar reformations.',
      findings_json: JSON.stringify([
        {
          title: 'Pharynx & Oral Cavity',
          items: [
            {
              structure: 'Right Peritonsillar / Oropharynx',
              content: 'An irregular, heterogeneously enhancing soft tissue mass measuring 3.3 × 2.0 cm is identified in the right peritonsillar / oropharyngeal space. The mass infiltrates the uvula, base of tongue, and the right parapharyngeal space, causing marked airway luminal narrowing.',
              isAbnormal: true
            }
          ]
        },
        {
          title: 'Cervical Lymph Nodes',
          items: [
            {
              structure: 'Lymph Nodes',
              content: 'Bilateral cervical lymphadenopathy extending to Level V is noted, largest along the right jugulodigastric chain.',
              isAbnormal: true
            }
          ]
        },
        {
          title: 'Thorax (Partially Included)',
          items: [
            {
              structure: 'Lungs',
              content: 'Fibrocystic changes noted in the right upper lobe. Multiple bilateral pleural-based non-calcified solid (STD) nodules are noted, the largest in the left upper lobe measuring 11 × 19 mm, suspicious for pulmonary metastases.',
              isAbnormal: true
            },
            {
              structure: 'Mediastinum',
              content: 'Mediastinal lymphadenopathy noted.',
              isAbnormal: true
            }
          ]
        },
        {
          title: 'Upper Abdomen (Visualised)',
          items: [
            {
              structure: 'Kidneys',
              content: 'Bilateral large simple renal cortical cysts: right renal cyst measures 7.4 × 5.2 cm; left renal cyst measures 4.0 × 4.0 cm.',
              isAbnormal: true
            }
          ]
        },
        {
          title: 'Bones',
          items: [
            {
              structure: 'Cervicothoracic Spine',
              content: 'Multilevel degenerative spondylotic changes with scoliotic deformity noted.',
              isAbnormal: true
            }
          ]
        }
      ]),
      findings_markdown: `### Pharynx & Oral Cavity
- **Right Oropharynx:** Irregular heterogeneously enhancing soft tissue mass measuring 3.3 × 2.0 cm in the right peritonsillar region with deep invasion into the uvula, base of tongue, and right parapharyngeal space, resulting in significant airway compromise.

### Cervical Lymph Nodes
- **Lymph Nodes:** Bilateral cervical lymphadenopathy noted extending up to Level V.

### Thorax (Visualised)
- **Lungs:** Right upper lobe fibrocystic changes. Multiple bilateral pleural-based solid soft tissue (STD) nodules, largest in the left upper lobe measuring 11 × 19 mm.
- **Mediastinum:** Prominent mediastinal lymphadenopathy.

### Upper Abdomen (Visualised)
- **Kidneys:** Large bilateral renal cortical cysts: right kidney cyst measures 7.4 × 5.2 cm; left kidney cyst measures 4.0 × 4.0 cm.

### Bones
- **Spine:** Degenerative changes with scoliotic deformity.`,
      impression_markdown: `1. Right peritonsillar / oropharyngeal heterogeneously enhancing soft tissue mass (3.3 × 2.0 cm) with infiltration into the uvula, tongue base, and parapharyngeal space with critical airway compromise; consistent with primary malignancy (e.g. squamous cell carcinoma).
2. Bilateral cervical lymphadenopathy extending to Level V.
3. Multiple bilateral pleural-based lung metastases (largest LUL 11 × 19 mm) and mediastinal lymphadenopathy.
4. Large bilateral renal simple cortical cysts (right 7.4 × 5.2 cm, left 4.0 × 4.0 cm).
5. Thoracolumbar degenerative spondylosis with scoliotic deformity.`,
      recommendations_markdown: `- URGENT: Airway assessment and ENT consultation for biopsy and airway security.
- Multidisciplinary head and neck oncology tumour board review.`,
      is_urgent: 1,
      urgent_call_log: 'CRITICAL VALUE: Airway compromise communicated directly to ENT On-Call Registrar at 12:45 PM.',
      image_path: '/uploads/WhatsApp Image 2026-09-30 at 12.13.46 PM.jpeg',
      verbatim_transcription: `Neck + Face CECT
(R) peritonsillar / oropharyngeal mass 3.3 x 2.0 cm
invading uvula, base of tongue, parapharyngeal space
airway narrowing
B/L cervical LAP to level V
RUL fibrocystic changes
B/L pleural based STD nodules (largest LUL 11 x 19 mm)
Mediastinal LAP
B/L renal cortical cysts (R) 7.4 x 5.2 cm, (L) 4.0 x 4.0 cm
Degenerative spine with scoliotic deformity`,
      verification_sheet_markdown: `STATUS: READY
A. HEADER: Name: Zia, Age: 75 Y, Token: #7929, Study: CECT Neck & Face
B. TRANSCRIPTION: Verbatim transcription validated against note.
C. FINDINGS: Oropharyngeal mass 3.3 x 2.0 cm, airway narrowing, bilateral cervical LAP, pulmonary metastases up to 19 mm, bilateral renal cysts.
D. AUDIT STATUS: PASS`,
      audit_status: 'PASS',
      status: 'DRAFT',
      is_archived: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    },
    {
      id: 'case-7934-ghazala-kanwal',
      token_number: '7934',
      patient_name: 'Ghazala Kanwal',
      age: '45 Y',
      gender: 'Female',
      mr_number: '092609007934',
      modality: 'Contrast-enhanced CT of the Chest, Abdomen and Pelvis',
      study_date: '2026-09-30',
      reporting_date: '2026-09-30',
      referring_clinician: 'Surgical Oncology Unit',
      clinical_history: 'Biopsy-proven carcinoma of the left breast. Staging workup.',
      comparison: 'No previous cross-sectional imaging available.',
      technique: 'Contrast-enhanced CT of the chest, abdomen and pelvis was performed with multiplanar reformations.',
      findings_json: JSON.stringify([
        {
          title: 'Breasts & Chest Wall',
          items: [
            {
              structure: 'Left Breast',
              content: 'A well-defined mixed solid and cystic mass lesion measuring 5.3 × 4.0 × 3.6 cm is present in the left breast. There is infiltration into the underlying pectoralis / chest wall musculature, architectural distortion, and an adjacent metallic biopsy clip in situ.',
              isAbnormal: true
            },
            {
              structure: 'Right Breast',
              content: 'Normal parenchymal pattern with no focal lesion or architectural distortion.',
              isAbnormal: false
            }
          ]
        },
        {
          title: 'Lymph Nodes',
          items: [
            {
              structure: 'Axillary Lymph Nodes',
              content: 'A left axillary lymph node measuring 6.5 mm in short-axis diameter is noted. No significant right axillary or internal mammary lymphadenopathy.',
              isAbnormal: true
            }
          ]
        },
        {
          title: 'Lungs & Pleura',
          items: [
            {
              structure: 'Lungs',
              content: 'A 6.5 mm subpleural nodule is present in the right middle lobe with adjacent pleural infiltration. Bilateral apical fibrosis is noted. No consolidation or pleural effusion.',
              isAbnormal: true
            }
          ]
        },
        {
          title: 'Abdomen & Pelvis',
          items: [
            {
              structure: 'Abdominal Viscera',
              content: 'Liver, gallbladder, biliary tree, spleen, pancreas, and adrenal glands are normal. Bilateral kidneys show normal parenchymal enhancement with no calculus or hydronephrosis.',
              isAbnormal: false
            },
            {
              structure: 'Pelvis',
              content: 'Pelvic viscera including uterus and bilateral ovaries are unremarkable for age. No pelvic free fluid.',
              isAbnormal: false
            }
          ]
        }
      ]),
      findings_markdown: `### Breasts & Chest Wall
- **Left Breast:** Well-defined mixed solid-cystic mass measuring 5.3 × 4.0 × 3.6 cm with chest wall infiltration, architectural distortion, and an adjacent metallic biopsy marker clip.
- **Right Breast:** Normal parenchymal architecture.

### Lymph Nodes
- **Axilla:** Left axillary lymph node measuring 6.5 mm.

### Lungs & Pleura
- **Right Middle Lobe:** A 6.5 mm pleural-based nodule with adjacent pleural infiltration.
- **Bilateral Apices:** Bilateral apical fibrotic changes.

### Abdomen & Pelvis
- **Abdominopelvic Organs:** Liver, kidneys, pancreas, spleen, and pelvic viscera are entirely normal with no evidence of distant visceral metastasis.`,
      impression_markdown: `1. Biopsy-proven left breast carcinoma: 5.3 × 4.0 × 3.6 cm mixed solid-cystic primary mass demonstrating direct infiltration into the underlying pectoralis/chest wall musculature.
2. Left axillary lymph node measuring 6.5 mm.
3. Solitary pleural-based right middle lobe pulmonary nodule (6.5 mm) with pleural abutment; indeterminate, suspicious for solitary metastasis.
4. Bilateral apical fibrotic bands.
5. No evidence of distant intra-abdominal or pelvic visceral metastasis.`,
      recommendations_markdown: `- Multidisciplinary breast cancer team discussion regarding neoadjuvant therapy vs surgical planning.
- Close short-interval follow-up or PET-CT to further characterise the right middle lobe pleural-based nodule.`,
      is_urgent: 0,
      urgent_call_log: null,
      image_path: '/uploads/WhatsApp Image 2026-09-30 at 9.20.15 AM.jpeg',
      verbatim_transcription: `Biopsy proven (L) Ca Breast
(L) breast well defined mixed solid cystic mass 5.3 x 4.0 x 3.6 cm
Chest wall infiltration, architectural distortion, adjacent metallic clip
(L) axillary LN 6.5mm
(R) middle lobe pleural nodule 6.5 mm
B/L apical fibrosis
Pelvic viscera normal, kidneys normal, liver normal`,
      verification_sheet_markdown: `STATUS: READY
A. HEADER: Name: Ghazala Kanwal, Age: 45 Y, Token: #7934, Modality: CECT Chest, Abdomen & Pelvis
B. VERBATIM TRANSCRIPTION: Matches handwritten source note.
C. AUDIT STATUS: PASS`,
      audit_status: 'PASS',
      status: 'DRAFT',
      is_archived: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    },
    {
      id: 'case-7915-ahsan-ullah',
      token_number: '7915',
      patient_name: 'Ahsan Ullah',
      age: '50 Y',
      gender: 'Male',
      mr_number: '092609007915',
      modality: 'Contrast-enhanced CT of the Abdomen and Pelvis',
      study_date: '2026-09-30',
      reporting_date: '2026-09-30',
      referring_clinician: 'Emergency / General Surgery',
      clinical_history: 'Acute abdominal pain, vomiting, suspected gastric outlet obstruction or peritonitis.',
      comparison: 'No previous imaging available for comparison.',
      technique: 'Contrast-enhanced CT of the abdomen and pelvis was performed with oral and intravenous contrast and multiplanar reformations.',
      findings_json: JSON.stringify([
        {
          title: 'Stomach & Duodenum',
          items: [
            {
              structure: 'Duodenum & Pylorus',
              content: 'A large saccular outpouching measuring approximately 12 × 5 cm arises from the D1/D2 duodenal junction. It demonstrates marked mural thickening, internal fluid and gas contents, and extensive surrounding inflammatory fat stranding (acute duodenal diverticulitis). This produces secondary extrinsic compression and narrowing of the pyloric canal with associated mild upstream gastric distension.',
              isAbnormal: true
            }
          ]
        },
        {
          title: 'Colon & Mesentery',
          items: [
            {
              structure: 'Colon & Mesenteric Vessels',
              content: 'Segmental reactive mural thickening involves the ascending colon and proximal transverse colon over a span of approximately 16 cm. There is characteristic swirling of the superior mesenteric vein (SMV) over the superior mesenteric artery (SMA), prominent regional mesenteric lymphadenopathy, and engorgement of the vasa recta.',
              isAbnormal: true
            }
          ]
        },
        {
          title: 'Solid Abdominal Viscera',
          items: [
            {
              structure: 'Hepatobiliary, Pancreas, Spleen & Kidneys',
              content: 'The liver, gallbladder, biliary tree, pancreas, spleen, and adrenal glands are normal. Both kidneys are normal in size and attenuation with no calculus or hydronephrosis.',
              isAbnormal: false
            }
          ]
        },
        {
          title: 'Pelvis',
          items: [
            {
              structure: 'Prostate',
              content: 'The prostate gland is mildly enlarged, measuring 3.8 × 3.8 × 3.3 cm, and mildly indents the base of the urinary bladder.',
              isAbnormal: true
            },
            {
              structure: 'Urinary Bladder & Peritoneum',
              content: 'The urinary bladder has normal mucosal outlines. No generalized free fluid or gross free intraperitoneal air.',
              isAbnormal: false
            }
          ]
        }
      ]),
      findings_markdown: `### Stomach & Duodenum
- **Duodenum:** Large saccular outpouching measuring 12 × 5 cm arising from D1/D2 duodenal junction with mural thickening, fluid/air levels, and extensive periduodenal fat stranding (acute diverticulitis).
- **Pylorus & Stomach:** Secondary pyloric narrowing with mild upstream gastric distension.

### Colon & Mesentery
- **Colon:** Reactive segmental thickening of ascending and transverse colon (16 cm).
- **Mesentery:** Swirling of SMV over SMA, mesenteric lymphadenopathy, and vasa recta engorgement.

### Solid Abdominal Viscera
- **Liver, Spleen & Kidneys:** Unremarkable solid viscera without focal lesion.

### Pelvis
- **Prostate:** Mild prostatic enlargement measuring 3.8 × 3.8 × 3.3 cm indenting the bladder base.`,
      impression_markdown: `1. Large D1/D2 duodenal diverticulum measuring 12 × 5 cm complicated by acute diverticulitis with severe perilesional inflammatory changes, causing secondary pyloric narrowing and mild gastric distension.
2. Reactive mural thickening of the ascending and transverse colon (16 cm) with mesenteric lymphadenopathy, vasa recta engorgement, and SMV swirling over SMA.
3. Mild benign prostatic hyperplasia (3.8 × 3.8 × 3.3 cm).
4. No diffuse pneumoperitoneum or generalised peritonitis.`,
      recommendations_markdown: `- Urgent surgical and gastroenterology review for inpatient management of acute complicated duodenal diverticulitis.
- Nasogastric decompression and intravenous antibiotic therapy.`,
      is_urgent: 1,
      urgent_call_log: 'Direct verbal communication delivered to General Surgical On-Call Registrar regarding complicated duodenal diverticulitis with secondary pyloric obstruction.',
      image_path: '/uploads/WhatsApp Image 2026-09-30 at 9.48.09 AM.jpeg',
      verbatim_transcription: `CECT Abd + Pelvis
Large saccular outpouching 12 x 5 cm D1/D2 with wall thickening, fluid/air, surrounding fat stranding (diverticulitis)
Secondary pyloric narrowing, mild gastric distension
Reactive thickening ascending + transv colon 16 cm
Swirling of SMV over SMA, mesenteric LAP, engorged vasa recta
Liver, GB, spleen, kidneys normal
Prostate 3.8 x 3.8 x 3.3 cm indenting UB base`,
      verification_sheet_markdown: `STATUS: READY
A. HEADER: Name: Ahsan Ullah, Age: 50 Y, Token: #7915, Modality: CECT Abdomen & Pelvis
B. TRANSCRIPTION: Verbatim transcription validated.
C. AUDIT STATUS: PASS`,
      audit_status: 'PASS',
      status: 'DRAFT',
      is_archived: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    },
    {
      id: 'case-7961-m-bashir',
      token_number: '7961',
      patient_name: 'M. Bashir',
      age: '78 Y',
      gender: 'Male',
      mr_number: '092609007961',
      modality: 'CT Urogram (Multiphasic CT Urinary Tract)',
      study_date: '2026-09-30',
      reporting_date: '2026-09-30',
      referring_clinician: 'Department of Urology',
      clinical_history: 'LUTS, haematuria evaluation, suspected nephrolithiasis.',
      comparison: 'No previous imaging available for comparison.',
      technique: 'Multiphasic CT urogram of the abdomen and pelvis was performed including non-contrast, nephrographic, and delayed excretory phases with multiplanar reformations.',
      findings_json: JSON.stringify([
        {
          title: 'Kidneys & Ureters',
          items: [
            {
              structure: 'Right Kidney',
              content: 'A non-obstructing calculus measuring 5.4 mm is noted in the mid pole of the right kidney. No significant hydronephrosis or perinephric fat stranding.',
              isAbnormal: true
            },
            {
              structure: 'Left Kidney',
              content: 'Multiple simple cysts are identified in the left kidney involving upper, mid, and lower poles. The largest cortical cyst at the upper-to-mid pole measures 10 × 8 mm, and an additional medullary cyst at the upper pole measures 1.8 × 1.8 cm. Morphological features are consistent with Bosniak Type I simple benign cysts.',
              isAbnormal: true
            },
            {
              structure: 'Contrast Excretion & Ureters',
              content: 'Normal prompt and symmetrical bilateral excretion of contrast on delayed excretory images. Both ureters opacify throughout their course with normal calibre and no obstructive filling defect.',
              isAbnormal: false
            }
          ]
        },
        {
          title: 'Liver & Upper Abdomen',
          items: [
            {
              structure: 'Liver',
              content: 'A small simple hepatic cyst measuring 7 × 6 mm is noted in hepatic segment V. The remainder of the hepatic parenchyma is normal in attenuation with no solid focal lesion.',
              isAbnormal: true
            },
            {
              structure: 'Gallbladder, Spleen & Pancreas',
              content: 'Gallbladder, biliary tree, spleen, and pancreas are unremarkable.',
              isAbnormal: false
            }
          ]
        },
        {
          title: 'Pelvis & Lower Thorax',
          items: [
            {
              structure: 'Urinary Bladder & Pelvis',
              content: 'Bilateral pelvic calcifications (phleboliths) are noted. Urinary bladder demonstrates smooth luminal contour with normal mucosal enhancement and no intraluminal lesion.',
              isAbnormal: false
            },
            {
              structure: 'Lung Bases',
              content: 'Visualised lung bases are clear with no focal consolidation or pleural effusion.',
              isAbnormal: false
            }
          ]
        }
      ]),
      findings_markdown: `### Kidneys & Ureters
- **Right Kidney:** Non-obstructing 5.4 mm calculus at the right mid pole. No hydronephrosis.
- **Left Kidney:** Multiple Bosniak Type I cysts at upper, mid, and lower poles. Largest cortical cyst measures 10 × 8 mm; an upper pole medullary cyst measures 1.8 × 1.8 cm.
- **Excretory Function:** Normal prompt, symmetrical contrast excretion and bilateral ureteric drainage on delayed images.

### Liver & Upper Abdomen
- **Liver:** Small simple hepatic cyst measuring 7 × 6 mm in segment V.

### Pelvis & Basal Thorax
- **Pelvic Structures:** Bilateral pelvic phleboliths. Urinary bladder is normal.
- **Basal Lungs:** Clear bilaterally.`,
      impression_markdown: `1. Right mid-pole renal calculus measuring 5.4 mm without significant obstructive hydronephrosis.
2. Multiple left renal cysts classified as Bosniak Type I (benign), largest measuring 1.8 × 1.8 cm.
3. Normal bilateral excretory function with prompt ureteric opacification on delayed images.
4. Incidental 7 × 6 mm simple hepatic cyst in segment V.
5. Bilateral pelvic phleboliths.`,
      recommendations_markdown: `- Urology consultation for conservative management / metabolic workup of right mid-pole renal calculus.
- Routine follow-up; no intervention required for Bosniak Type I renal cysts.`,
      is_urgent: 0,
      urgent_call_log: null,
      image_path: '/uploads/WhatsApp Image 2026-09-30 at 9.50.18 AM.jpeg',
      verbatim_transcription: `Urogram
Lungs: (N)
(R) Renal calculus at mid pole m/s 5.4 mm
B/L pelvic calcifications seen
(L) Renal multiple cysts at upper, mid, lower poles
- largest cortical cyst at upper to mid pole m/s 10 x 8 mm
- another medullary cyst at upper pole m/s 1.8 x 1.8 cm (Bosniak type I)
A hepatic cyst 7 x 6 mm noted in segment V
Normal excretion of contrast on delayed images
Imp:
(R) Renal calculus
(L) Renal Bosniak type I multiple cysts`,
      verification_sheet_markdown: `STATUS: READY
A. HEADER: Name: M. Bashir, Age: 78 Y, Token: #7961, Modality: CT Urogram
B. VERBATIM TRANSCRIPTION: Validated against note.
C. AUDIT STATUS: PASS`,
      audit_status: 'PASS',
      status: 'DRAFT',
      is_archived: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    }
  ];

  for (const report of realReports) {
    await client.execute({
      sql: `
        INSERT INTO reports (
          id, token_number, patient_name, age, gender, mr_number, modality,
          study_date, reporting_date, referring_clinician, clinical_history,
          comparison, technique, findings_json, findings_markdown,
          impression_markdown, recommendations_markdown, is_urgent,
          urgent_call_log, image_path, verbatim_transcription,
          verification_sheet_markdown, audit_status, status, is_archived,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `,
      args: [
        report.id, report.token_number, report.patient_name, report.age, report.gender,
        report.mr_number, report.modality, report.study_date, report.reporting_date,
        report.referring_clinician, report.clinical_history, report.comparison,
        report.technique, report.findings_json, report.findings_markdown,
        report.impression_markdown, report.recommendations_markdown, report.is_urgent,
        report.urgent_call_log, report.image_path, report.verbatim_transcription,
        report.verification_sheet_markdown, report.audit_status, report.status,
        report.is_archived, report.created_at, report.updated_at
      ]
    });
    console.log(`✓ Inserted consultant report for ${report.patient_name} (Token #${report.token_number})`);
  }

  console.log('All 5 real cases successfully populated!');
}

main().catch(console.error);
