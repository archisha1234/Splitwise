import type { PoolClient } from "pg";

export async function insertActivity(
  client: PoolClient,
  groupId: string,
  actorId: string,
  type: string,
  entityType: string,
  entityId: string | null,
  payload: Record<string, unknown>
) {
  await client.query(
    `
      insert into activity_events (group_id, actor_id, type, entity_type, entity_id, payload)
      values ($1, $2, $3, $4, $5, $6)
    `,
    [groupId, actorId, type, entityType, entityId, payload]
  );
}
