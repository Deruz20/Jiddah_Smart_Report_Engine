import { PowerSyncBackendConnector, AbstractPowerSyncDatabase } from '@powersync/web';
import { createClient } from '../../utils/supabase/client';
import { assertWriteApplied } from './write-ack';

export class SupabaseConnector implements PowerSyncBackendConnector {
  client = createClient();

  async fetchCredentials() {
    const endpoint = process.env.NEXT_PUBLIC_POWERSYNC_URL;
    if (!endpoint) {
      return null;
    }

    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error || !session) {
        return null;
      }

      return {
        endpoint,
        token: session.access_token,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined
      };
    } catch (error) {
      console.error('PowerSync credential lookup failed; local changes remain queued.', error);
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
          // Check for stale theology_status
          if (op.table === 'theology_marks' && op.opData && op.opData.enrollment_id) {
            const { data: enrollment, error: enrollmentError } = await this.client
              .from('enrollments')
              .select('theology_status')
              .eq('id', op.opData.enrollment_id)
              .maybeSingle();

            if (enrollmentError || !enrollment) {
              throw new Error(enrollmentError?.message || 'Unable to verify theology enrollment before upload.');
            }
              
            if (enrollment.theology_status === 'not_applicable') {
              const { data: { session } } = await this.client.auth.getSession();
              if (session?.user?.id) {
                const { error: activityError } = await this.client.from('activity_log').insert({
                  teacher_id: session.user.id,
                  action_type: 'stale_theology_write',
                  target_table: op.table,
                  target_id: op.id,
                  description: 'Teacher synced theology marks for a student whose theology_status was changed online to not_applicable while they were offline.',
                  metadata: { reason: 'theology_not_applicable' }
                });
                if (activityError) {
                  throw new Error(`Unable to record blocked stale theology write: ${activityError.message}`);
                }
              }
              throw new Error('Theology enrollment is no longer applicable; keeping the stale mark queued for review.');
            }
          }

          // op.opData contains the data. We also need to inject id.
          const result = await table.upsert({ id: op.id, ...op.opData }).select('id');
          assertWriteApplied('PUT', result);
        } else if (op.op === 'PATCH') {
          const result = await table.update(op.opData).eq('id', op.id).select('id');
          assertWriteApplied('PATCH', result);
        } else if (op.op === 'DELETE') {
          const result = await table.delete().eq('id', op.id).select('id');
          assertWriteApplied('DELETE', result);
        }
      }
      await transaction.complete();
    } catch (ex) {
      console.error('PowerSync upload deferred for operation:', lastOp?.op, lastOp?.table, lastOp?.id, ex);
      // Wait before retrying
      throw ex;
    }
  }
}
