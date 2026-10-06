// Modalities and the regions each can examine, for the Create Report dialog. Plain data: edit freely.
// Region names follow the AGENTS.md Section 8 checklists where one exists. Keep this file free of Node/DOM imports.

export interface RegionGroup {
  group: string;
  regions: string[];
}

const HEAD_NECK_US = ['Thyroid', 'Neck (soft tissues and lymph nodes)', 'Salivary glands', 'Orbit / eye'];

const MSK_JOINTS = ['Shoulder', 'Elbow', 'Wrist', 'Hand', 'Hip', 'Knee', 'Ankle', 'Foot'];

export const STUDIES: Record<string, RegionGroup[]> = {
  'X-ray': [
    { group: 'Head and neck', regions: ['Skull', 'Facial bones', 'Nasal bones', 'Mandible', 'Paranasal sinuses', 'Mastoids', 'Soft tissue neck', 'Orbits', 'Cervical spine'] },
    { group: 'Chest', regions: ['Chest', 'Chest PA', 'Chest AP', 'Ribs', 'Sternum', 'Clavicle', 'Thoracic inlet'] },
    { group: 'Abdomen', regions: ['Abdomen (erect and supine)', 'Abdomen (supine)', 'KUB'] },
    { group: 'Spine and pelvis', regions: ['Thoracic spine', 'Lumbosacral spine', 'Sacrum and coccyx', 'Sacroiliac joints', 'Pelvis', 'Scoliosis (whole spine)'] },
    { group: 'Upper limb', regions: ['Shoulder', 'Humerus', 'Elbow', 'Forearm', 'Wrist', 'Hand', 'Fingers', 'Scaphoid', 'Acromioclavicular joints'] },
    { group: 'Lower limb', regions: ['Hip', 'Femur', 'Knee', 'Tibia and fibula', 'Ankle', 'Foot', 'Calcaneum', 'Toes', 'Both knees (weight-bearing)', 'Lower limb (full length)'] },
    { group: 'Other', regions: ['Bone age (left hand and wrist)', 'Skeletal survey', 'Foreign body localisation', 'Dental (OPG)'] },
  ],
  Ultrasound: [
    { group: 'Abdomen and pelvis', regions: ['Abdomen', 'Abdomen and pelvis', 'KUB', 'Liver and biliary tree', 'Pancreas', 'Spleen', 'Kidneys', 'Urinary bladder', 'Post-void residual', 'Abdominal wall / hernia', 'Appendix', 'Bowel (including intussusception)', 'Pyloric region'] },
    { group: 'Female pelvis', regions: ['Pelvis (transabdominal)', 'Pelvis (transvaginal)', 'Uterus and ovaries', 'Follicular study', 'Endometrial thickness'] },
    { group: 'Obstetric', regions: ['Obstetric (first trimester)', 'Obstetric (second trimester)', 'Obstetric (third trimester)', 'Anomaly scan', 'Growth scan', 'Biophysical profile', 'Cervical length', 'Twin pregnancy'] },
    { group: 'Male pelvis', regions: ['Prostate (transabdominal)', 'Scrotum', 'Penis'] },
    { group: 'Small parts', regions: [...HEAD_NECK_US, 'Breast (both)', 'Breast (right)', 'Breast (left)', 'Axillae', 'Parathyroid'] },
    { group: 'Chest', regions: ['Chest / pleura', 'Chest wall'] },
    { group: 'Musculoskeletal', regions: [...MSK_JOINTS, 'Soft tissue lump', 'Muscle / tendon', 'Hip (infant)'] },
    { group: 'Neonatal and paediatric', regions: ['Cranial (neonatal)', 'Spine (neonatal)', 'Hip (infant)'] },
    { group: 'Doppler', regions: ['Carotid and vertebral Doppler', 'Upper limb venous Doppler', 'Upper limb arterial Doppler', 'Lower limb venous Doppler', 'Lower limb arterial Doppler', 'Renal Doppler', 'Portal and hepatic vein Doppler', 'Aorta and iliac Doppler', 'Testicular Doppler', 'Obstetric Doppler', 'Transcranial Doppler', 'AV fistula Doppler', 'Thyroid Doppler'] },
  ],
  CT: [
    { group: 'Head and neck', regions: ['Brain', 'Brain and posterior fossa', 'Orbits', 'Paranasal sinuses', 'Temporal bones', 'Face', 'Neck (soft tissue)', 'Neck and larynx', 'Skull base', 'Dental / mandible'] },
    { group: 'Chest', regions: ['Chest', 'HRCT chest', 'CTPA', 'Chest, abdomen and pelvis', 'Cardiac / coronary calcium score', 'Coronary CT angiography'] },
    { group: 'Abdomen and pelvis', regions: ['Abdomen', 'Abdomen and pelvis', 'KUB', 'Liver (multiphasic)', 'Pancreas protocol', 'Adrenals', 'Enterography', 'Colonography', 'Urography', 'Pelvis', 'Appendix'] },
    { group: 'Spine', regions: ['Cervical spine', 'Thoracic spine', 'Lumbar spine', 'Sacrum and coccyx', 'Whole spine'] },
    { group: 'Musculoskeletal', regions: [...MSK_JOINTS, 'Pelvis and acetabulum', 'Femur', 'Tibia and fibula', 'Forearm', 'Humerus', 'Clavicle', 'Sternoclavicular joints'] },
    { group: 'Angiography', regions: ['Brain angiography (CTA)', 'Neck vessels angiography', 'Aortogram (thoracic and abdominal)', 'Pulmonary angiography', 'Renal angiography', 'Mesenteric angiography', 'Upper limb angiography', 'Lower limb angiography (runoff)', 'Venography'] },
    { group: 'Other', regions: ['Whole body (trauma)', 'PET-CT correlation', 'CT-guided biopsy planning'] },
  ],
  MRI: [
    { group: 'Brain and head', regions: ['Brain', 'Brain with contrast', 'Pituitary / sella', 'Internal auditory canals / CP angle', 'Orbits', 'Epilepsy protocol', 'Brain perfusion / diffusion', 'MR spectroscopy', 'Paranasal sinuses', 'Temporal bones', 'TMJ', 'Face', 'Skull base'] },
    { group: 'Neck and chest', regions: ['Neck (soft tissue)', 'Nasopharynx', 'Chest', 'Mediastinum', 'Breast', 'Cardiac MRI', 'Brachial plexus'] },
    { group: 'Spine', regions: ['Cervical spine', 'Thoracic spine', 'Lumbosacral spine', 'Whole spine', 'Sacroiliac joints', 'Sacrum and coccyx'] },
    { group: 'Abdomen and pelvis', regions: ['Abdomen', 'Liver (with contrast)', 'MRCP', 'Pancreas', 'Kidneys', 'MR urography', 'MR enterography', 'Pelvis (female)', 'Pelvis (male)', 'Prostate (multiparametric)', 'Rectum (staging)', 'Perianal fistula', 'Uterus (adenomyosis / fibroids)', 'Obstetric (fetal MRI)'] },
    { group: 'Musculoskeletal', regions: [...MSK_JOINTS, 'Both knees', 'Both hips', 'Pelvis', 'Thigh', 'Leg', 'Arm', 'Forearm', 'Soft tissue lump', 'Whole body (bone marrow)', 'Brachial plexus'] },
    { group: 'Angiography', regions: ['MRA brain (TOF)', 'MRA neck', 'MRV brain', 'MRA thoracic aorta', 'MRA abdominal aorta', 'MRA renal', 'MRA peripheral'] },
  ],
  'Fluoroscopy / Contrast': [
    { group: 'Gastrointestinal', regions: ['Barium swallow', 'Barium meal', 'Barium meal and follow-through', 'Barium follow-through', 'Barium enema', 'Defecography', 'Sinogram / fistulogram', 'Loopogram'] },
    { group: 'Urinary', regions: ['IVU', 'MCUG', 'Retrograde urethrogram', 'Cystogram', 'Nephrostogram', 'Antegrade pyelogram'] },
    { group: 'Gynaecological', regions: ['HSG'] },
    { group: 'Biliary and other', regions: ['T-tube cholangiogram', 'ERCP', 'Sialogram', 'Dacryocystogram', 'Arthrogram', 'Myelogram'] },
  ],
  Mammography: [
    { group: 'Breast', regions: ['Both breasts (screening)', 'Both breasts (diagnostic)', 'Right breast', 'Left breast', 'Tomosynthesis', 'Magnification views', 'Specimen radiograph'] },
  ],
  DEXA: [
    { group: 'Bone density', regions: ['Lumbar spine and hip', 'Lumbar spine', 'Hip', 'Forearm', 'Whole body composition'] },
  ],
  'Nuclear medicine / PET': [
    { group: 'PET', regions: ['PET-CT whole body (FDG)', 'PET-CT brain', 'PSMA PET-CT', 'DOTATATE PET-CT'] },
    { group: 'Scintigraphy', regions: ['Bone scan', 'Thyroid scan', 'Renal scan (DTPA / DMSA)', 'Hepatobiliary scan', 'Gastric emptying', 'Lung perfusion (V/Q)', 'Myocardial perfusion', 'MIBG', 'Parathyroid (sestamibi)', 'Gallium scan', 'Lymphoscintigraphy'] },
  ],
  'Angiography / Interventional': [
    { group: 'Diagnostic angiography', regions: ['Cerebral angiography', 'Carotid angiography', 'Coronary angiography', 'Aortogram', 'Renal angiography', 'Mesenteric angiography', 'Peripheral angiography', 'Venography', 'Pulmonary angiography'] },
    { group: 'Interventional', regions: ['Embolisation', 'Stent placement', 'Angioplasty', 'Biopsy', 'Drainage', 'Chemoembolisation (TACE)', 'IVC filter', 'Vertebroplasty'] },
  ],
};

export const MODALITIES = Object.keys(STUDIES);

/** Regions of one modality whose name or group contains every word of the query; the groups keep their order. */
export function searchRegions(modality: string, query: string): RegionGroup[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const out: RegionGroup[] = [];
  for (const g of STUDIES[modality] ?? []) {
    const seen = new Set<string>();
    const regions = g.regions.filter((r) => {
      if (seen.has(r)) return false;
      seen.add(r);
      const hay = `${r} ${g.group}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    if (regions.length) out.push({ group: g.group, regions });
  }
  return out;
}

/** "CT" + "Abdomen and pelvis" → "CT: Abdomen and pelvis"; either part may be empty. */
export const studyLabel = (modality: string, region: string) => [modality, region].map((s) => s.trim()).filter(Boolean).join(': ');
