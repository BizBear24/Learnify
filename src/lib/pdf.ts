import { extractText, getDocumentProxy } from "unpdf";

export const MAX_BYTES = 4 * 1024 * 1024;
export const MAX_PAGES = 15;
export const MIN_CHARS = 500;
export const MAX_CHARS = 12000;

export class PdfError extends Error {}

export async function pdfToText(buf: Uint8Array): Promise<string> {
  if (buf.byteLength > MAX_BYTES) throw new PdfError("PDF is larger than 4 MB.");
  let pdf;
  try {
    pdf = await getDocumentProxy(buf);
  } catch {
    throw new PdfError("Could not read that file as a PDF.");
  }
  if (pdf.numPages > MAX_PAGES) {
    throw new PdfError(`PDF has ${pdf.numPages} pages; the limit is ${MAX_PAGES}.`);
  }
  const { text } = await extractText(pdf, { mergePages: true });
  const clean = (Array.isArray(text) ? text.join("\n") : text).replace(/\s+/g, " ").trim();
  if (clean.length < MIN_CHARS) {
    throw new PdfError("Not enough text found - scanned PDFs aren't supported.");
  }
  return clean.slice(0, MAX_CHARS);
}
