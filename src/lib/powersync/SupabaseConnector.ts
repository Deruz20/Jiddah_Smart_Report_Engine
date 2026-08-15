import { PowerSyncBackendConnector, AbstractPowerSyncDatabase } from '@powersync/web';
import { createClient } from '../../utils/supabase/client';

export class SupabaseConnector implements PowerSyncBackendConnector {
  client = createClient();

  async fetchCredentials() {
    const { data: { session }, error } = await this.client.auth.getSession();
    if (error || !session) {
      return null;
    }

    return {
      endpoint: process.env.NEXT_PUBLIC_POWERSYNC_URL || 'http://localhost:8080',
      token: session.access_token,
      expiresAt: new Date(session.expires_at! * 1000)
    };
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
            const { data: enrollment } = await this.client
              .from('enrollments')
              .select('theology_status')
              .eq('id', op.opData.enrollment_id)
              .single();
              
            if (enrollment && enrollment.theology_status === 'not_applicable') {
              const { data: { session } } = await this.client.auth.getSession();
              if (session?.user?.id) {
                await this.client.from('activity_log').insert({
                  teacher_id: session.user.id,
                  action_type: 'stale_theology_write',
                  target_table: op.table,
                  target_id: op.id,
                  description: 'Teacher synced theology marks for a student whose theology_status was changed online to not_applicable while they were offline.',
                  metadata: { opData: op.opData }
                });
              }
            }
          }

          // op.opData contains the data. We also need to inject id.
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
      console.error('Upload error for op:', lastOp, ex);
      // Wait before retrying
      throw ex;
    }
  }
}
