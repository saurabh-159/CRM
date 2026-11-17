import { ActivityLog } from "@/models/ActivityLog";

export async function recordActivity(params) {
  try {
    await ActivityLog.create({
      companyId: params.companyId || null,
      actorId: params.actorId || null,
      actorName: params.actorName,
      actorRole: params.actorRole,
      actionType: params.actionType,
      description: params.description,
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.error("Failed to record activity log:", err);
  }
}