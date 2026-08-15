"use client";

import React, { useEffect, useState } from "react";
import ActivityClient from "./activity-client";
import { usePowerSync } from "@powersync/react";

export default function MyActivityClient({ teacherName, teacherEmail }: { teacherName: string, teacherEmail: string }) {
  const powerSync = usePowerSync();
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await powerSync.getAll(`
          SELECT * FROM activity_log
          ORDER BY created_at DESC
          LIMIT 100
        `);

        const formatted = data.map((item: any) => {
          const action = String(item.action_type ?? 'Activity')
          const entityType = item.target_table || 'system'
          const entityLabel = String(item.description || action)
          
          return {
            id: String(item.id || item.teacher_id || Math.random()),
            user_name: String(teacherName || teacherEmail || 'Me'),
            action,
            entity_label: entityLabel,
            entity_type: entityType,
            created_at: item.created_at ?? new Date().toISOString(),
          }
        });

        setActivities(formatted);
      } catch (e) {
        console.error("Error fetching activity logs:", e);
      }
    };

    fetchActivities();
  }, [powerSync, teacherName, teacherEmail]);

  return <ActivityClient initialActivities={activities} />;
}
