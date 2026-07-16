import { prisma } from '../utils/db.js';
import { StorageService } from '../services/StorageService.js';

export class CertificateTemplateModel {
    static async uploadAndSave(filePath, filename, mimeType, description, uploadedBy) {
        console.log('[CERT TEMPLATE MODEL] Uploading', filename);
        const objectKey = StorageService.buildObjectKey('certificates/templates', filename);
        await StorageService.uploadFile(objectKey, filePath, mimeType);

        const template = await prisma.certificateTemplate.create({
            data: {
                filename,
                blobUrl: objectKey,
                mimeType,
                description,
                createdBy: uploadedBy
            },
            include: { creator: true }
        });

        return template;
    }

    static async findMany() {
        return prisma.certificateTemplate.findMany({
            include: { creator: { select: { fullName: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async findById(id) {
        return prisma.certificateTemplate.findUnique({
            where: { id },
            include: { creator: true }
        });
    }

    static async findLatest() {
        return prisma.certificateTemplate.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { creator: true }
        });
    }
}
