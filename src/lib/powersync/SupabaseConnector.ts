import { PowerSyncBackendConnector, AbstractPowerSyncDatabase } from '@powersync/web';
import { createClient } from '../supabase-browser';

export class SupabaseConnector implements PowerSyncBackendConnector {
  client = createClient();

  async fetchCredentials() {
    const { data: { session }, error } = await this.client.auth.getSession();
    if (error || !session) {
      throw new Error('Not authenticated');
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
