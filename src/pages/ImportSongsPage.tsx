import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const ImportSongsPage: React.FC = () => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const runImport = async () => {
    setImporting(true);
    setResult(null);
    setLogs(['Calling import edge function...']);

    try {
      const { data, error } = await supabase.functions.invoke('import-songs-csv', {
        body: {}
      });

      if (error) {
        setLogs(prev => [...prev, `Error: ${error.message}`]);
        return;
      }

      setResult(data);
      setLogs(data.logs || []);
    } catch (error: any) {
      setLogs(prev => [...prev, `Unexpected error: ${error.message}`]);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Import Songs from CSV</CardTitle>
            <CardDescription>
              Import 129 songs with automatic canonical theme mapping
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={runImport}
                disabled={importing}
                size="lg"
              >
                {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {importing ? 'Importing...' : result ? 'Import Again' : 'Start Import'}
              </Button>
            </div>

            {result && (
              <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{result.imported}</div>
                  <div className="text-xs text-muted-foreground">Imported</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{result.skipped}</div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{result.errors}</div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{result.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            )}

            {logs.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Import Log</h3>
                <div className="max-h-[500px] overflow-y-auto p-4 bg-muted rounded-lg font-mono text-xs space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className="text-muted-foreground">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
