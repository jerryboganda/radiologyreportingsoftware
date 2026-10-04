// The issued report's fixed parts: the letterhead and the sign-off block. The print template and the
// on-screen report twin both read from here so the two can never drift apart.
//
// Values are editable in the app (in place on the sheet, and in Settings). One profile is stored
// globally and snapshotted onto every case at creation, so a later edit never rewrites an issued
// report. This file holds the factory defaults and the sanitiser; the stored profile lives in the DB.

export interface Radiologist {
  name: string;
  qualification: string;
}

export interface InstitutionProfile {
  government: string;
  department: string;
  hospital: string;
  hod: string;
  hodQualification: string;
  seniorRegistrars: string;
  reportingRadiologists: Radiologist[];
  footer: string;
}

/** Factory defaults, also the fallback when nothing is stored yet. */
export const INSTITUTION = {
  government: 'Government of the Punjab • Specialized Healthcare & Medical Education',
  department: 'Department of Diagnostic Radiology',
  hospital: 'Gujranwala Teaching Hospital | Gujranwala Medical College',
  hod: 'Prof. Dr. Mian Waheed Ahmad',
  seniorRegistrars: 'Dr. Samiya Shahzadi / Dr. Sidra Ghaffar',
  reportingRadiologists: [
    { name: 'Dr. Sana Fatima', qualification: 'MBBS (WMO Diagnostic Radiology)' },
    { name: 'Dr. Faisal Maqsood Anwar', qualification: 'MBBS, FCPS-II Resident' },
    { name: 'Dr. Areeba', qualification: 'MBBS, FCPS-II Resident' },
  ],
  hodQualification: 'MBBS, FCPS, BSc (Radiology) • Head of Department',
  footer: 'Confidential Medical Diagnostic Record • Gujranwala Teaching Hospital (GMCTH)',
} satisfies InstitutionProfile;

export const defaultProfile = (): InstitutionProfile => ({
  ...INSTITUTION,
  reportingRadiologists: INSTITUTION.reportingRadiologists.map((doc) => ({ ...doc })),
});

/** Reporters beyond this are refused rather than silently dropped. */
export const MAX_REPORTERS = 12;

const TEXT_LIMITS: Record<keyof Omit<InstitutionProfile, 'reportingRadiologists'>, number> = {
  government: 300,
  department: 200,
  hospital: 200,
  hod: 120,
  hodQualification: 200,
  seniorRegistrars: 200,
  footer: 300,
};

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/**
 * Any stored or posted profile becomes a complete, printable profile. A field that is present is
 * taken as typed (so it can be cleared on purpose); a field that is absent keeps the factory default.
 * Reporter rows are trimmed of blanks and capped. Nothing outside the shape survives.
 */
export function sanitizeProfile(input: unknown): InstitutionProfile {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out = defaultProfile();
  for (const key of Object.keys(TEXT_LIMITS) as (keyof typeof TEXT_LIMITS)[]) {
    if (typeof raw[key] === 'string') out[key] = text(raw[key], TEXT_LIMITS[key]);
  }
  const rows = Array.isArray(raw.reportingRadiologists) ? raw.reportingRadiologists : [];
  const reporters: Radiologist[] = [];
  for (const row of rows.slice(0, MAX_REPORTERS)) {
    const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
    const name = text(r.name, 120);
    const qualification = text(r.qualification, 200);
    if (name || qualification) reporters.push({ name, qualification });
  }
  out.reportingRadiologists = reporters;
  return out;
}

/** The stored profile (already sanitised on write) over the factory defaults. */
export function mergeProfile(stored: unknown): InstitutionProfile {
  return stored ? sanitizeProfile(stored) : defaultProfile();
}

/** The profile a case prints with, from its stored snapshot; the factory defaults when it has none. */
export function profileFromSnapshot(json: string | null | undefined): InstitutionProfile {
  if (!json) return defaultProfile();
  try {
    return mergeProfile(JSON.parse(json));
  } catch {
    return defaultProfile();
  }
}

export const documentRef = (tokenNumber: string, id: string) => `GMCTH-${tokenNumber}-${id.substring(0, 6).toUpperCase()}`;