// Server-only access to the stored institution profile: the single copy every new case prints with,
// and the snapshot each case keeps so a later edit never rewrites an issued report.
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { reports, settings } from '../db/schema';
import { defaultProfile, mergeProfile, sanitizeProfile, type InstitutionProfile } from './institution';

const SETTING_KEY = 'institution';

async function readSetting(): Promise<string | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, SETTING_KEY));
  return row?.value ?? null;
}

async function writeSetting(value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key: SETTING_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

/** The saved profile over the factory defaults. Never null: an empty store reads as the GMCTH defaults. */
export async function readInstitution(): Promise<InstitutionProfile> {
  const raw = await readSetting();
  if (!raw) return defaultProfile();
  try {
    return mergeProfile(JSON.parse(raw));
  } catch {
    return defaultProfile();
  }
}

/** Saves the profile every future case will print with. Always sanitised before it touches the DB. */
export async function saveInstitution(input: unknown): Promise<InstitutionProfile> {
  const profile = sanitizeProfile(input);
  await writeSetting(JSON.stringify(profile));
  return profile;
}

/** Drops the stored profile; the factory defaults apply again to every case created from now on. */
export async function resetInstitution(): Promise<InstitutionProfile> {
  await db.delete(settings).where(eq(settings.key, SETTING_KEY));
  return defaultProfile();
}

/** One-shot snapshot for a case created before the profile was stored: it keeps the profile it prints with. */
export async function snapshotInstitution(id: string, profile: InstitutionProfile): Promise<void> {
  await db.update(reports).set({ institutionJson: JSON.stringify(profile) }).where(eq(reports.id, id));
}

/**
 * The profile one case prints with: its own snapshot when it has one, otherwise the stored profile,
 * written back to the row so an older case can never drift onto a later profile.
 */
export async function reportInstitution(report: { id: string; institutionJson: string | null }): Promise<InstitutionProfile> {
  if (report.institutionJson) {
    try {
      return mergeProfile(JSON.parse(report.institutionJson));
    } catch {
      // A damaged snapshot falls through to the stored profile, then gets replaced below.
    }
  }
  const profile = await readInstitution();
  await snapshotInstitution(report.id, profile).catch(() => {});
  return profile;
}