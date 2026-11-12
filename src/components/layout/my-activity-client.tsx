"use client";

import React, { useEffect, useState } from "react";
import ActivityClient from "./activity-client";
import { createClient } from "@/utils/supabase/client";
import { offlineFetchJson } from "@/lib/offline-sync";

export default function MyActivityClient({
  teacherName,
  teacherEmail,
}: {
  teacherName: string;
  teacherEmail: string;
}) {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const fetchActivities = async () => {
      try {
        const res = await offlineFetchJson<{ data?: any[] }>("/api/activity?limit=100", {
          cacheKey: "my_activity_v1",
          onBackgroundRefresh: (fresh: any) => {
            if (!active || !Array.isArray(fresh?.data)) return;
            setActivities(
              fresh.data.map((item: any) => ({
                id: String(item.id || Math.random()),
                user_name: String(teacherName || teacherEmail || "Me"),
                action: String(item.action_type ?? item.action ?? "Activity"),
                entity_label: String(item.description || item.entity_label || "Activity"),
                entity_type: item.target_table || item.entity_type || "system",
                created_at: item.created_at ?? new Date().toISOString(),
              }))
            );
          },
        });
        if (active && Array.isArray(res.data?.data)) {
          setActivities(
            res.data.data.map((item: any) => ({
              id: String(item.id || Math.random()),
              user_name: String(teacherName || teacherEmail || "Me"),
              action: String(item.action_type ?? item.action ?? "Activity"),
              entity_label: String(item.description || item.entity_label || "Activity"),
              entity_type: item.target_table || item.entity_type || "system",
              created_at: item.created_at ?? new Date().toISOString(),
            }))
          );
          return;
        }
      } catch {
        // Fallback to direct Supabase query when offline or API returns non-array
      }

      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (!active || !data) return;
        setActivities(
          data.map((item: any) => ({
            id: String(item.id || Math.random()),
            user_name: String(teacherName || teacherEmail || "Me"),
            action: String(item.action_type ?? item.action ?? "Activity"),
            entity_label: String(item.description || item.entity_label || item.action || "Activity"),
            entity_type: item.target_table || item.entity_type || "system",
            created_at: item.created_at ?? new Date().toISOString(),
          }))
        );
      } catch (e) {
        console.error("Error fetching activity logs:", e);
      }
    };

    fetchActivities();
    return () => {
      active = false;
    };
  }, [teacherName, teacherEmail]);

  return <ActivityClient initialActivities={activities} />;
}
