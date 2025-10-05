import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import songsData from '@/data/songs.json';

export default function MigrateLegacySongs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('migrate-legacy-songs', {
        body: { songs: songsData }
      });

      if (invokeError) throw invokeError;
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Migration failed');
      console.error('Migration error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto max-w-4xl p-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/')}
        className="mb-6"
      >
        ← Back to Home
      </Button>

      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-4">Migrate Legacy Songs</h1>
        <p className="text-muted-foreground mb-6">
          This will import all songs from the legacy songs.json file into the Supabase database.
          Songs that already exist (by slug) will be skipped.
        </p>

        <Button 
          onClick={runMigration}
          disabled={loading}
          size="lg"
        >
          {loading ? 'Running Migration...' : 'Run Migration'}
        </Button>

        {result && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h2 className="font-semibold text-lg mb-2">Migration Successful!</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Total songs in JSON:</dt>
                <dd className="font-mono">{result.totalSongs}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Already in database:</dt>
                <dd className="font-mono">{result.alreadyInDb}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Songs inserted:</dt>
                <dd className="font-mono font-bold">{result.inserted}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Feeling cards inserted:</dt>
                <dd className="font-mono font-bold">{result.feelingCardsInserted}</dd>
              </div>
            </dl>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <h2 className="font-semibold text-lg mb-2">Migration Failed</h2>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </Card>
    </main>
  );
}
