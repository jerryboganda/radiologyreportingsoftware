import type { APIRoute } from 'astro';
import { DATA_DIR, db } from '../../../db';
import { reports } from '../../../db/schema';
import { and, eq } from 'drizzle-orm';
import { generatePdfFromUrl } from '../../../lib/pdf/generator';
import { hasReportBody } from '../../../lib/report';
import { today } from '../../../lib/ingest';
import path from 'node:path';
import fs from 'node:fs';

/** Approve & download: issues a DRAFT (which becomes FINALIZED) or re-issues a FINALIZED report. */
export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return Response.json({ error: 'Missing report id' }, { status: 400 });
  }

  const [report] = await db.select().from(reports).where(eq(reports.id, id));
  if (!report) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }
  if ((report.status !== 'DRAFT' && report.status !== 'FINALIZED') || !hasReportBody(report)) {
    return Response.json({ error: 'Only a draft or finalized report with findings and an impression can be issued as a PDF' }, { status: 409 });
  }

  // Target filename format: <PatientName>_<Age>_<TokenNumber>.pdf
  // Sanitize for file system and content-disposition
  const cleanName = (report.patientName || 'Patient').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanAge = (report.age || 'Age').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanToken = (report.tokenNumber || 'Token').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const downloadFilename = `${cleanName}_${cleanAge}_${cleanToken}.pdf`;

  const pdfDir = path.join(DATA_DIR, 'pdfs');
  fs.mkdirSync(pdfDir, { recursive: true });

  const isDraft = and(eq(reports.id, id), eq(reports.status, 'DRAFT'));
  let pdfBuffer: Uint8Array<ArrayBuffer>;
  try {
    // Issuing a draft dates it today. Set before printing so the PDF carries the same date.
    if (report.status === 'DRAFT') {
      await db.update(reports).set({ reportingDate: today(), updatedAt: new Date() }).where(isDraft);
    }

    // Always print through loopback: never trust the Host header for a server-side fetch.
    pdfBuffer = new Uint8Array(await generatePdfFromUrl(`http://127.0.0.1:${process.env.PORT || 4321}/print/${id}`));
    fs.writeFileSync(path.join(pdfDir, downloadFilename), pdfBuffer);

    if (report.status === 'DRAFT') {
      await db.update(reports).set({ status: 'FINALIZED', updatedAt: new Date() }).where(isDraft);
    }
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return Response.json({ error: 'Failed to generate PDF: ' + error.message }, { status: 500 });
  }

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${downloadFilename}"`,
      'Content-Length': pdfBuffer.length.toString(),
      'Cache-Control': 'no-cache'
    }
  });
};
