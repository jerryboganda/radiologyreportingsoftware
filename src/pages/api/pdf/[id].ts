import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { reports } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { generatePdfFromUrl } from '../../../lib/pdf/generator';
import path from 'node:path';
import fs from 'node:fs';

export const GET: APIRoute = async ({ params, url, request }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing report id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = await db.select().from(reports).where(eq(reports.id, id));
  if (!result || result.length === 0) {
    return new Response(JSON.stringify({ error: 'Report not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const report = result[0];

  // Target filename format: <PatientName>_<Age>_<TokenNumber>.pdf
  // Sanitize for file system and content-disposition
  const cleanName = (report.patientName || 'Patient').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanAge = (report.age || 'Age').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanToken = (report.tokenNumber || 'Token').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const downloadFilename = `${cleanName}_${cleanAge}_${cleanToken}.pdf`;

  const pdfDir = path.resolve(process.cwd(), 'data', 'pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  const localPdfPath = path.join(pdfDir, downloadFilename);

  // Generate PDF via Headless Chrome snapshotting print view
  let pdfBuffer: Buffer;
  try {
    const host = request.headers.get('host') || 'localhost:4321';
    const printUrl = `http://${host}/print/${id}`;
    pdfBuffer = await generatePdfFromUrl(printUrl);
    fs.writeFileSync(localPdfPath, pdfBuffer);

    // Update status in database
    await db.update(reports).set({
      status: 'FINALIZED',
      updatedAt: new Date()
    }).where(eq(reports.id, id));
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate PDF: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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
