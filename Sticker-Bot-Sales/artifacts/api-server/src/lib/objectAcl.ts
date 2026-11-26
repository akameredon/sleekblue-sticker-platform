import { sql } from "drizzle-orm";
import { db } from "./db";

export enum ObjectAccessGroupType {}
export interface ObjectAccessGroup { type: ObjectAccessGroupType; id: string; }
export enum ObjectPermission { READ = "read", WRITE = "write" }
export interface ObjectAclRule { group: ObjectAccessGroup; permission: ObjectPermission; }
export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

/** ACLs live in our own table; Supabase's storage schema is treated as read-only. */
export async function setObjectAclPolicy(objectPath: string, policy: ObjectAclPolicy): Promise<void> {
  await db.execute(sql`
    insert into public.object_acl (object_path, owner_id, visibility, acl_rules, updated_at)
    values (${objectPath}, ${policy.owner}, ${policy.visibility}, ${JSON.stringify(policy.aclRules ?? [])}::jsonb, now())
    on conflict (object_path) do update set
      owner_id = excluded.owner_id,
      visibility = excluded.visibility,
      acl_rules = excluded.acl_rules,
      updated_at = now()
  `);
}

export async function getObjectAclPolicy(objectPath: string): Promise<ObjectAclPolicy | null> {
  const result = await db.execute(sql`
    select owner_id, visibility, acl_rules
    from public.object_acl where object_path = ${objectPath} limit 1
  `);
  const row = result.rows[0] as { owner_id: string; visibility: "public" | "private"; acl_rules: ObjectAclRule[] } | undefined;
  if (!row) return null;
  return { owner: row.owner_id, visibility: row.visibility, aclRules: row.acl_rules ?? [] };
}

function isPermissionAllowed(requested: ObjectPermission, granted: ObjectPermission): boolean {
  if (requested === ObjectPermission.READ) return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  return granted === ObjectPermission.WRITE;
}

export async function canAccessObject({
  userId,
  objectPath,
  requestedPermission,
}: {
  userId?: string;
  objectPath: string;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const acl = await getObjectAclPolicy(objectPath);
  if (!acl) return false;
  if (acl.visibility === "public" && requestedPermission === ObjectPermission.READ) return true;
  if (!userId) return false;
  if (acl.owner === userId) return true;
  // No access-group types are currently enabled. Unknown group grants fail closed.
  return (acl.aclRules ?? []).some((rule) =>
    rule.group.type === ("USER_LIST" as ObjectAccessGroupType) &&
    rule.group.id === userId &&
    isPermissionAllowed(requestedPermission, rule.permission)
  );
}
