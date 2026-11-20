import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, createClient } from "@/utils/supabase/server";
import { apiOptions, corsPreflight, withCors } from "@/lib/api-cors";
import { verifyDataAccess, hasPermission } from "@/lib/auth-server";
import { resolveCurrentSchoolId } from "@/lib/tenant-context";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request);
}

interface ValidationItem {
  id: string;
  entity_type: string;
  entity_id: string;
  client_timestamp: number;
  base_timestamp?: string | number | null;
  local_payload?: any;
}

export async function POST(request: NextRequest) {
  const preflight = corsPreflight(request);
  if (preflight) return preflight;

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return withCors(
        request,
        NextResponse.json({ error: "Unauthorized: Authentication required." }, { status: 401 })
      );
    }

    const authRes = await verifyDataAccess(supabase, user, "read");
    if (!authRes.isAuthorized) {
      return withCors(
        request,
        NextResponse.json(
          { error: authRes.message || "Forbidden: Access denied." },
          { status: 403 }
        )
      );
    }

    const schoolId = await resolveCurrentSchoolId(supabase, user, request);
    const body = await request.json().catch(() => ({}));
    const items = (Array.isArray(body.items) ? body.items : []) as ValidationItem[];

    let supabaseAdmin = null;
    try {
      supabaseAdmin = createAdminClient(cookieStore);
    } catch {
      supabaseAdmin = supabase;
    }

    const validations = await Promise.all(
      items.map(async (item) => {
        let hasConflict = false;
        let serverUpdatedAt: string | null = null;
        let serverData: any = null;

        if (!item.entity_id || !item.entity_type) {
          return {
            id: item.id,
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            has_conflict: false,
          };
        }

        try {
          let tableName = "circular_marks";
          if (item.entity_type === "theology_marks") tableName = "theology_marks";
          else if (item.entity_type === "students") tableName = "students";
          else if (item.entity_type === "attendance") tableName = "attendance";

          const { data, error } = await supabaseAdmin
            .from(tableName)
            .select("*")
            .eq("id", item.entity_id)
            .maybeSingle();

          if (!error && data) {
            serverData = data;
            serverUpdatedAt = (data as any).updated_at || (data as any).created_at || null;

            if (serverUpdatedAt && item.base_timestamp) {
              const serverTime = new Date(serverUpdatedAt).getTime();
              const baseTime =
                typeof item.base_timestamp === "number"
                  ? item.base_timestamp
                  : new Date(item.base_timestamp).getTime();

              if (!isNaN(serverTime) && !isNaN(baseTime)) {
                // If the server record was updated after the user's base snapshot timestamp, flag conflict
                if (serverTime > baseTime) {
                  hasConflict = true;
                }
              }
            }
          }
        } catch (queryErr) {
          logger.warn("Timestamp validation query failed", { entityId: item.entity_id, err: queryErr });
        }

        return {
          id: item.id,
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          has_conflict: hasConflict,
          server_updated_at: serverUpdatedAt,
          server_data: serverData,
        };
      })
    );

    return withCors(
      request,
      NextResponse.json({
        success: true,
        validations,
      })
    );
  } catch (error: any) {
    logger.error("Failed to validate sync timestamps", { error: error?.message });
    return withCors(
      request,
      NextResponse.json(
        { error: "Internal Server Error during timestamp validation." },
        { status: 500 }
      )
    );
  }
}
