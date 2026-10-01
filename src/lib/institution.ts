// Fixed parts of the issued report. The print template and the on-screen report twin both read
// from here so the two can never drift apart.

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
} as const;

export const documentRef = (tokenNumber: string, id: string) => `GMCTH-${tokenNumber}-${id.substring(0, 6).toUpperCase()}`;
