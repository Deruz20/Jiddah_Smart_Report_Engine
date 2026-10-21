import { PowerSyncBackendConnector, AbstractPowerSyncDatabase } from '@powersync/web';
import { createClient } from '../../utils/supabase/client';

export const CREDENTIALS_TIMEOUT_MS = 2000;

export class SupabaseConnector implements PowerSyncBackendConnector {
  client = createClient();

  async fetchCredentials() {
    const endpoint = process.env.NEXT_PUBLIC_POWERSYNC_URL;
    if (!endpoint) {
      // In production or direct-Supabase mode where PowerSync instance is unconfigured,
      // return null so the SDK enters disconnected standby instead of polling localhost:8080.
      return null;
    }

    try {
      const sessionPromise = this.client.auth.getSession();
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), CREDENTIALS_TIMEOUT_MS)
      );

      const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
      if (!sessionResult || !('data' in sessionResult)) {
        return null;
      }

      const { data: { session }, error } = sessionResult;
      if (error || !session) {
        return null;
      }

      return {
        endpoint,
        token: session.access_token,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
      };
    } catch {
      // Silently fall back to direct Supabase queries on Failed to fetch or network timeout
      return null;
    }
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    let lastOp;
    try {
      for (const op of transaction.crud) {
        lastOp = op;
        const table = this.client.from(op.table);
        
        if (op.op === 'PUT') {
          if (op.table === 'theology_marks' && op.opData && op.opData.enrollment_id) {
            const { data: enrollment } = await this.client
              .from('enrollments')
              .select('theology_status')
              .eq('id', op.opData.enrollment_id)
              .single();
              
            if (enrollment && enrollment.theology_status === 'not_applicable') {
              const { data: { session } } = await this.client.auth.getSession();
              if (session?.user?.id) {
                await this.client.from('activity_logs').insert({
                  user_id: session.user.id,
                  action: 'stale_theology_write',
                  details: {
                    target_table: op.table,
                    target_id: op.id,
                    description: 'Teacher synced theology marks for a student whose theology_status was changed online to not_applicable while they were offline.',
                    opData: op.opData
                  }
                });
              }
            }
          }

          const { error } = await table.upsert({ id: op.id, ...op.opData });
          if (error) throw error;
        } else if (op.op === 'PATCH') {
          const { error } = await table.update(op.opData).eq('id', op.id);
          if (error) throw error;
        } else if (op.op === 'DELETE') {
          const { error } = await table.delete().eq('id', op.id);
          if (error) throw error;
        }
      }
      await transaction.complete();
    } catch (ex) {
      console.warn('PowerSync background upload deferred:', lastOp, ex);
      throw ex;
    }
  }
}
