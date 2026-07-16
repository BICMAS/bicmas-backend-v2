import { StorageService } from '../services/StorageService.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const DEFAULT_THEME_CONFIG = {
    theme: 'classic',
    title: 'Certificate of Completion',
    signatory: '',
    signatoryRole: '',
    showDate: true,
};

const THEME_STYLES = {
    classic: {
        background: rgb(1, 0.98, 0.94),
        primary: rgb(0.31, 0.06, 0.45),
        accent: rgb(0.72, 0.53, 0.04),
        muted: rgb(0.45, 0.45, 0.45),
        titleSize: 34,
        nameSize: 30,
        bodySize: 16,
        titleFont: 'TimesRomanBold',
        bodyFont: 'TimesRoman',
        signatoryFont: 'TimesRomanBoldItalic',
    },
    modern: {
        background: rgb(1, 1, 1),
        primary: rgb(0.31, 0.06, 0.45),
        accent: rgb(0.33, 0.65, 0.15),
        muted: rgb(0.42, 0.45, 0.5),
        titleSize: 30,
        nameSize: 28,
        bodySize: 15,
        titleFont: 'HelveticaBold',
        bodyFont: 'Helvetica',
        signatoryFont: 'HelveticaBold',
    },
    tech: {
        background: rgb(0.96, 0.97, 0.98),
        primary: rgb(0.12, 0.17, 0.24),
        accent: rgb(0.33, 0.65, 0.15),
        muted: rgb(0.35, 0.4, 0.45),
        titleSize: 26,
        nameSize: 24,
        bodySize: 14,
        titleFont: 'CourierBold',
        bodyFont: 'Courier',
        signatoryFont: 'CourierBold',
    },
};

function slugify(value) {
    return String(value || 'certificate')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function formatIssueDate(date) {
    return new Date(date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function parseTemplateMetadata(description) {
    if (!description) {
        return { internalNote: '', themeConfig: { ...DEFAULT_THEME_CONFIG } };
    }

    try {
        const parsed = JSON.parse(description);
        if (parsed?.themeConfig) {
            return {
                internalNote: parsed.internalNote || '',
                themeConfig: { ...DEFAULT_THEME_CONFIG, ...parsed.themeConfig },
            };
        }
    } catch {
        // Fall through — treat description as a plain internal note.
    }

    return { internalNote: description, themeConfig: { ...DEFAULT_THEME_CONFIG } };
}

export function serializeTemplateMetadata(internalNote, themeConfig) {
    return JSON.stringify({
        internalNote: internalNote || '',
        themeConfig: { ...DEFAULT_THEME_CONFIG, ...themeConfig },
    });
}

function getThemeStyle(themeName) {
    return THEME_STYLES[themeName] || THEME_STYLES.classic;
}

async function embedLogo(pdfDoc, logoBytes, mimeType) {
    const normalizedMime = String(mimeType || '').toLowerCase();
    if (normalizedMime.includes('png')) {
        return pdfDoc.embedPng(logoBytes);
    }
    if (normalizedMime.includes('jpeg') || normalizedMime.includes('jpg')) {
        return pdfDoc.embedJpg(logoBytes);
    }

    try {
        return pdfDoc.embedPng(logoBytes);
    } catch {
        return pdfDoc.embedJpg(logoBytes);
    }
}

function drawThemeFrame(page, themeName, width, height, styles) {
    if (themeName === 'classic') {
        page.drawRectangle({
            x: 24,
            y: 24,
            width: width - 48,
            height: height - 48,
            borderColor: styles.accent,
            borderWidth: 3,
        });
        page.drawRectangle({
            x: 36,
            y: 36,
            width: width - 72,
            height: height - 72,
            borderColor: rgb(0.75, 0.75, 0.75),
            borderWidth: 1,
        });
        return;
    }

    if (themeName === 'modern') {
        page.drawRectangle({
            x: 0,
            y: height - 18,
            width,
            height: 18,
            color: styles.primary,
        });
        page.drawRectangle({
            x: 0,
            y: 0,
            width: 8,
            height,
            color: styles.accent,
        });
        return;
    }

    page.drawRectangle({
        x: 0,
        y: height - 56,
        width,
        height: 56,
        color: styles.primary,
    });
    page.drawRectangle({
        x: width - 120,
        y: height - 120,
        width: 120,
        height: 120,
        color: rgb(0.88, 0.91, 0.94),
    });
}

function drawCenteredText(page, text, y, size, font, color) {
    const safeText = String(text || '');
    const { width } = page.getSize();
    const textWidth = font.widthOfTextAtSize(safeText, size);
    const x = Math.max(24, (width - textWidth) / 2);
    page.drawText(safeText, { x, y, size, font, color });
}

export class CertificatePdfService {
    static async generateAndUpload({ template, traineeName, courseTitle, issuedAt }) {
        if (!template) throw new Error('Template required');
        if (!traineeName) throw new Error('Trainee name required');
        if (!courseTitle) throw new Error('Course title required');

        const { themeConfig } = parseTemplateMetadata(template.description);
        const styles = getThemeStyle(themeConfig.theme);
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([842, 595]);
        const { width, height } = page.getSize();

        page.drawRectangle({
            x: 0,
            y: 0,
            width,
            height,
            color: styles.background,
        });

        drawThemeFrame(page, themeConfig.theme, width, height, styles);

        const titleFont = await pdfDoc.embedFont(StandardFonts[styles.titleFont]);
        const bodyFont = await pdfDoc.embedFont(StandardFonts[styles.bodyFont]);
        const signatoryFont = await pdfDoc.embedFont(StandardFonts[styles.signatoryFont]);

        let contentTop = height - 72;

        if (template.blobUrl) {
            const logoBytes = await StorageService.getObjectBuffer(template.blobUrl);
            const logoImage = await embedLogo(pdfDoc, logoBytes, template.mimeType);
            const maxLogoWidth = 140;
            const maxLogoHeight = 72;
            const scale = Math.min(
                maxLogoWidth / logoImage.width,
                maxLogoHeight / logoImage.height,
                1,
            );
            const logoWidth = logoImage.width * scale;
            const logoHeight = logoImage.height * scale;

            page.drawImage(logoImage, {
                x: (width - logoWidth) / 2,
                y: contentTop - logoHeight,
                width: logoWidth,
                height: logoHeight,
            });

            contentTop -= logoHeight + 24;
        }

        const headerColor =
            themeConfig.theme === 'tech' ? rgb(1, 1, 1) : styles.muted;
        drawCenteredText(page, 'Prime Impact', contentTop, 11, bodyFont, headerColor);
        drawCenteredText(
            page,
            themeConfig.title || DEFAULT_THEME_CONFIG.title,
            contentTop - 42,
            styles.titleSize,
            titleFont,
            themeConfig.theme === 'tech' ? rgb(1, 1, 1) : styles.primary,
        );

        drawCenteredText(page, 'This certifies that', height * 0.46, styles.bodySize, bodyFont, styles.muted);
        drawCenteredText(page, traineeName, height * 0.38, styles.nameSize, titleFont, styles.primary);
        drawCenteredText(
            page,
            'has successfully completed the course requirements for',
            height * 0.30,
            styles.bodySize,
            bodyFont,
            styles.muted,
        );
        drawCenteredText(page, courseTitle, height * 0.24, styles.bodySize + 2, titleFont, styles.primary);

        if (themeConfig.showDate !== false) {
            drawCenteredText(
                page,
                `Issued on ${formatIssueDate(issuedAt)}`,
                height * 0.18,
                13,
                bodyFont,
                styles.muted,
            );
        }

        if (themeConfig.signatory) {
            const signatoryY = 96;
            drawCenteredText(
                page,
                themeConfig.signatory,
                signatoryY + 18,
                16,
                signatoryFont,
                styles.primary,
            );
            page.drawLine({
                start: { x: width / 2 - 90, y: signatoryY + 8 },
                end: { x: width / 2 + 90, y: signatoryY + 8 },
                thickness: 1,
                color: styles.muted,
            });
            if (themeConfig.signatoryRole) {
                drawCenteredText(
                    page,
                    themeConfig.signatoryRole,
                    signatoryY - 8,
                    10,
                    bodyFont,
                    styles.muted,
                );
            }
        }

        const generatedBytes = await pdfDoc.save();
        const filename = `${slugify(traineeName)}-${slugify(courseTitle)}-${Date.now()}.pdf`;
        const objectKey = StorageService.buildObjectKey('certificates/generated', filename);
        await StorageService.uploadBuffer(objectKey, Buffer.from(generatedBytes), 'application/pdf');

        return {
            filename,
            blobUrl: objectKey,
        };
    }
}
