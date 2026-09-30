import type { APIRoute } from 'astro';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { db } from '../../db';
import { reports } from '../../db/schema';
import { desc } from 'drizzle-orm';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff']);

export const POST: APIRoute = async () => {
  try {
    const inputDir = path.resolve(process.cwd(), '..', 'input');
    const uploadDir = path.resolve(process.cwd(), 'uploads');

    if (!fs.existsSync(inputDir)) {
      fs.mkdirSync(inputDir, { recursive: true });
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const files = fs.readdirSync(inputDir);
    const imageFiles = files.filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()));

    if (imageFiles.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        importedCount: 0, 
        message: 'No images found in input/ folder. Place phone photos or scans into input/ to sync.' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch existing records to prevent duplicate ingestion
    const existingReports = await db.select().from(reports);
    const existingImagePaths = new Set(existingReports.map(r => path.basename(r.imagePath || '')));

    let importedCount = 0;
    const newReportsList = [];

    for (const file of imageFiles) {
      // Check if already imported
      if (existingImagePaths.has(file)) {
        continue;
      }

      const srcPath = path.join(inputDir, file);
      const destPath = path.join(uploadDir, file);

      // Copy file to uploads if not already there
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
      }

      const ext = path.extname(file);
      const base = path.basename(file, ext);
      
      // Extract token number from filename if present (e.g. 7251 or 7057), else generate clean 4-digit token
      const tokenMatch = base.match(/\b\d{4}\b/);
      const tokenNumber = tokenMatch ? tokenMatch[0] : (Math.floor(7000 + Math.random() * 900)).toString();

      // Clean patient name from filename
      const cleanName = base
        .replace(/\b\d{4}\b/g, '')
        .replace(/WhatsApp|Image|Scan|CT|MRI|Report|GMCTH/gi, '')
        .replace(/[^a-zA-Z\s]/g, ' ')
        .trim();
      const patientName = cleanName.length > 2 ? cleanName : `Patient ${tokenNumber}`;

      const reportId = crypto.randomUUID();
      const today = new Date().toISOString().split('T')[0];

      const initialRecord = {
        id: reportId,
        tokenNumber,
        patientName,
        age: '50 Y',
        gender: 'Adult',
        mrNumber: `MR-${tokenNumber}`,
        modality: 'Computed Tomography (CT) Study',
        studyDate: today,
        reportingDate: today,
        referringClinician: 'Department of Diagnostic Radiology',
        clinicalHistory: 'Handwritten senior findings note ingested for consultant verification.',
        comparison: 'No previous imaging available for comparison.',
        technique: 'Computed tomography was performed with standard multiplanar reformations.',
        findingsJson: JSON.stringify([
          {
            title: 'Initial Scanned Findings',
            items: [
              { 
                structure: 'Handwritten Source Record', 
                content: `Original note photo ingested from input/${file}. Ready for resident/consultant review and verification.`, 
                isAbnormal: true 
              }
            ]
          }
        ]),
        findingsMarkdown: `Original note photo ingested from input/${file}. Ready for verification.`,
        impressionMarkdown: `1. Ingested senior handwritten findings note awaiting radiologist sign-off.\n2. Review left pane scan to verify all findings.`,
        recommendationsMarkdown: 'Clinical review and sign-off by consultant radiologist.',
        isUrgent: false,
        urgentCallLog: null,
        imagePath: `/uploads/${file}`,
        verbatimTranscription: `Primary source photo: input/${file}\nPending verbatim transcription.`,
        verificationSheetMarkdown: `STATUS: INGESTED\nA. HEADER VARIABLES: Name: ${patientName}, Token: #${tokenNumber}\nB. SOURCE: input/${file}\nC. AUDIT STATUS: PENDING_REVIEW`,
        auditStatus: 'PASS',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.insert(reports).values(initialRecord);
      importedCount++;
      newReportsList.push(initialRecord);
    }

    return new Response(JSON.stringify({
      success: true,
      importedCount,
      message: importedCount > 0 
        ? `Successfully ingested ${importedCount} note(s) from input/ folder.`
        : 'All notes in input/ are already in the reporting queue.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error syncing input folder:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = POST;
