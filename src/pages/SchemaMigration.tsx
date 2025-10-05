import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface MigrationStep {
  id: string;
  name: string;
  description: string;
  sql: string;
  completed: boolean;
  error?: string;
}

export default function SchemaMigration() {
  const navigate = useNavigate();
  const [migrationSteps, setMigrationSteps] = useState<MigrationStep[]>([
    {
      id: 'add_columns',
      name: 'Add New Columns',
      description: 'Add song_title, public_id, parent_song_id, version_label, is_cover columns',
      sql: `
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS song_title TEXT;
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS parent_song_id UUID;
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS version_label TEXT;
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false;
      `,
      completed: false
    },
    {
      id: 'backfill_data',
      name: 'Backfill Data',
      description: 'Copy title to song_title and ensure no null values',
      sql: `
        UPDATE songs 
        SET song_title = COALESCE(song_title, title)
        WHERE song_title IS NULL;
      `,
      completed: false
    },
    {
      id: 'create_function',
      name: 'Create Slug Function',
      description: 'Create function for artist+title based slugs',
      sql: `
        CREATE OR REPLACE FUNCTION public.set_song_slug()
        RETURNS trigger AS $$
        BEGIN
          IF NEW.slug IS NULL OR NEW.slug = '' THEN
            NEW.slug := regexp_replace(
              lower(NEW.artist || '-' || NEW.song_title), 
              '[^a-z0-9]+', '-', 'g'
            );
          END IF;
          RETURN NEW;
        END; 
        $$ LANGUAGE plpgsql;
      `,
      completed: false
    },
    {
      id: 'update_slugs',
      name: 'Update Existing Slugs',
      description: 'Update slugs to use artist+title pattern',
      sql: `
        UPDATE songs 
        SET slug = regexp_replace(lower(artist || '-' || song_title), '[^a-z0-9]+', '-', 'g')
        WHERE slug NOT LIKE '%-%' OR slug IS NULL;
      `,
      completed: false
    },
    {
      id: 'add_constraints',
      name: 'Add Constraints & Indexes',
      description: 'Add uniqueness constraints and performance indexes',
      sql: `
        ALTER TABLE songs 
          ALTER COLUMN artist SET NOT NULL,
          ALTER COLUMN song_title SET NOT NULL;
          
        CREATE UNIQUE INDEX IF NOT EXISTS songs_artist_title_ver_idx
        ON songs (lower(artist), lower(song_title), COALESCE(version_label, ''));
        
        CREATE UNIQUE INDEX IF NOT EXISTS songs_slug_key ON songs(slug);
        CREATE UNIQUE INDEX IF NOT EXISTS songs_public_id_key ON songs(public_id);
      `,
      completed: false
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const runMigrationStep = async (step: MigrationStep) => {
    setCurrentStep(step.id);
    
    try {
      // For some operations, we need to use RPC to execute raw SQL
      const { error } = await supabase.rpc('exec_sql', { sql: step.sql });
      
      if (error) throw error;

      // Mark step as completed
      setMigrationSteps(prev => 
        prev.map(s => 
          s.id === step.id 
            ? { ...s, completed: true, error: undefined }
            : s
        )
      );

    } catch (error) {
      console.error(`Migration step ${step.id} failed:`, error);
      
      setMigrationSteps(prev => 
        prev.map(s => 
          s.id === step.id 
            ? { ...s, error: error instanceof Error ? error.message : 'Unknown error' }
            : s
        )
      );
    }
    
    setCurrentStep(null);
  };

  const runAllSteps = async () => {
    setIsRunning(true);
    
    for (const step of migrationSteps) {
      if (!step.completed) {
        await runMigrationStep(step);
        // Wait a bit between steps
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsRunning(false);
  };

  const allCompleted = migrationSteps.every(step => step.completed);
  const hasErrors = migrationSteps.some(step => step.error);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          ← Back to Home
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Schema Migration</CardTitle>
            <p className="text-muted-foreground">
              Upgrade your songs table with enhanced features: artist+title slugs, 
              case-insensitive uniqueness, stable public IDs, and cover song support.
            </p>
          </CardHeader>
          <CardContent>
            {allCompleted ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  ✅ Migration Completed Successfully!
                </h3>
                <p className="text-green-600 dark:text-green-300 mt-2">
                  Your database schema has been updated with all the new features.
                </p>
              </div>
            ) : hasErrors ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
                <h3 className="font-semibold text-red-800 dark:text-red-200">
                  ⚠️ Migration Issues Detected
                </h3>
                <p className="text-red-600 dark:text-red-300 mt-2">
                  Some steps failed. You may need to run them manually in the Supabase SQL Editor.
                </p>
              </div>
            ) : (
              <div className="flex gap-4 mb-6">
                <Button 
                  onClick={runAllSteps} 
                  disabled={isRunning}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isRunning ? 'Running Migration...' : 'Run Full Migration'}
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {migrationSteps.map((step, index) => (
                <div 
                  key={step.id}
                  className={`p-4 border rounded-lg ${
                    step.completed 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                      : step.error
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        step.completed 
                          ? 'bg-green-500 text-white' 
                          : currentStep === step.id
                          ? 'bg-blue-500 text-white animate-pulse'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {step.completed ? '✓' : index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold">{step.name}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    
                    {!step.completed && !isRunning && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runMigrationStep(step)}
                        disabled={currentStep === step.id}
                      >
                        {currentStep === step.id ? 'Running...' : 'Run Step'}
                      </Button>
                    )}
                  </div>
                  
                  {step.error && (
                    <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded text-sm text-red-700 dark:text-red-300">
                      <strong>Error:</strong> {step.error}
                      <details className="mt-2">
                        <summary className="cursor-pointer">View SQL</summary>
                        <pre className="mt-2 text-xs overflow-x-auto">{step.sql}</pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}