import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';

function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function getItemTitle(item) {
    const titleNode = item?.title;
    if (!titleNode) return null;
    if (typeof titleNode === 'string') return titleNode.trim();
    const langstring = titleNode.langstring;
    if (typeof langstring === 'string') return langstring.trim();
    if (Array.isArray(langstring)) return String(langstring[0] ?? '').trim();
    return String(langstring?._ ?? langstring ?? '').trim() || null;
}

function collectLeafItems(item, items = []) {
    const children = asArray(item?.item);
    if (children.length === 0) {
        items.push({
            identifier: item?.identifier ?? null,
            identifierref: item?.identifierref ?? null,
            title: getItemTitle(item),
        });
        return items;
    }

    for (const child of children) {
        collectLeafItems(child, items);
    }
    return items;
}

export async function parseManifestActivitiesFromZip(filePath) {
    const zip = new AdmZip(filePath);
    const manifestEntry = zip
        .getEntries()
        .find((entry) => entry.entryName.toLowerCase().endsWith('imsmanifest.xml'));

    if (!manifestEntry) {
        throw new Error('SCORM manifest (imsmanifest.xml) not found in package');
    }

    const manifestXml = manifestEntry.getData().toString('utf8');
    const manifestJson = await parseStringPromise(manifestXml, {
        explicitArray: false,
        mergeAttrs: true,
        trim: true,
    });

    const manifest = manifestJson?.manifest;
    if (!manifest) {
        throw new Error('Invalid SCORM manifest structure');
    }

    const organizations = asArray(manifest.organizations?.organization);
    const defaultOrgId = manifest.organizations?.default;
    const organization =
        organizations.find((org) => org.identifier === defaultOrgId) ??
        organizations[0];

    if (!organization) {
        throw new Error('No organization found in SCORM manifest');
    }

    const rootItems = asArray(organization.item);
    const leafItems = [];
    for (const item of rootItems) {
        collectLeafItems(item, leafItems);
    }

    const activities = leafItems
        .filter((item) => item.identifier)
        .map((item, index) => ({
            identifier: item.identifier,
            identifierref: item.identifierref ?? null,
            title: item.title ?? `Module ${index + 1}`,
            sortOrder: index,
        }));

    const schemaVersion =
        manifest.metadata?.schemaversion ??
        manifest.schemaversion ??
        '2004 4th Edition';

    return {
        activities,
        schemaVersion: String(schemaVersion),
        organizationId: organization.identifier ?? null,
    };
}
