"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CertificatePdfService = void 0;
var _StorageService = require("../services/StorageService.js");
var _pdfLib = require("pdf-lib");
function slugify(value) {
  return String(value || 'certificate').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
function formatIssueDate(date) {
  return new Date(date).toLocaleDateString('en-GB');
}
class CertificatePdfService {
  static async generateAndUpload({
    templateUrl,
    traineeName,
    courseTitle,
    issuedAt
  }) {
    if (!templateUrl) throw new Error('Template URL required');
    if (!traineeName) throw new Error('Trainee name required');
    if (!courseTitle) throw new Error('Course title required');
    const templateBytes = await _StorageService.StorageService.getObjectBuffer(templateUrl);
    const pdfDoc = await _pdfLib.PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    if (!pages.length) throw new Error('Template PDF has no pages');
    const page = pages[0];
    const {
      width,
      height
    } = page.getSize();
    const titleFont = await pdfDoc.embedFont(_pdfLib.StandardFonts.TimesRomanBold);
    const bodyFont = await pdfDoc.embedFont(_pdfLib.StandardFonts.TimesRoman);
    const textColor = (0, _pdfLib.rgb)(0.12, 0.17, 0.24);
    const drawCenteredText = (text, y, size, font) => {
      const safeText = String(text || '');
      const textWidth = font.widthOfTextAtSize(safeText, size);
      const x = Math.max(24, (width - textWidth) / 2);
      page.drawText(safeText, {
        x,
        y,
        size,
        font,
        color: textColor
      });
    };
    drawCenteredText(traineeName, height * 0.44, 34, titleFont);
    drawCenteredText(`Course: ${courseTitle}`, height * 0.32, 18, bodyFont);
    drawCenteredText(`Issued on ${formatIssueDate(issuedAt)}`, height * 0.26, 14, bodyFont);
    const generatedBytes = await pdfDoc.save();
    const filename = `${slugify(traineeName)}-${slugify(courseTitle)}-${Date.now()}.pdf`;
    const objectKey = _StorageService.StorageService.buildObjectKey('certificates/generated', filename);
    await _StorageService.StorageService.uploadBuffer(objectKey, Buffer.from(generatedBytes), 'application/pdf');
    return {
      filename,
      blobUrl: objectKey
    };
  }
}
exports.CertificatePdfService = CertificatePdfService;