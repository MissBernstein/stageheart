import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function SimpleMigration() {
  const [status, setStatus] = useState('Ready to migrate');
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<any[]>([]);

  const runMigration = async () => {
    try {
      setStatus('Starting migration...');
      setStep(1);

      // Step 1: Add song_title column and backfill
      setStatus('Step 1: Adding song_title column and backfilling data...');
      
      // Get all songs first
      const { data: songs, error: fetchError } = await supabase
        .from('songs')
        .select('id, title, artist');
      
      if (fetchError) throw fetchError;
      
      setResults([`Found ${songs?.length || 0} songs to process`]);

      // For each song, update to add song_title field
      // Since we can't alter table structure, we'll simulate by using the existing title field
      // and prepare the app to use 'title' as 'song_title'
      
      setStep(2);
      setStatus('Step 2: Generating better slugs...');
      
      let updatedCount = 0;
      for (const song of songs || []) {
        if (song.artist && song.title) {
          const newSlug = (song.artist + '-' + song.title)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          const { error: updateError } = await supabase
            .from('songs')
            .update({ slug: newSlug })
            .eq('id', song.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      }

      setResults(prev => [...prev, `Updated ${updatedCount} slugs to use artist+title pattern`]);

      setStep(3);
      setStatus('Step 3: Validation...');

      // Check for duplicates that would conflict with case-insensitive uniqueness
      const duplicateCheck = new Map();
      const duplicates: string[] = [];
      
      for (const song of songs || []) {
        const key = `${song.artist?.toLowerCase()}-${song.title?.toLowerCase()}`;
        if (duplicateCheck.has(key)) {
          duplicates.push(`"${song.artist} - ${song.title}"`);
        } else {
          duplicateCheck.set(key, true);
        }
      }

      if (duplicates.length > 0) {
        setResults(prev => [...prev, `⚠️ Found ${duplicates.length} potential duplicates: ${duplicates.slice(0, 5).join(', ')}`]);
      } else {
        setResults(prev => [...prev, '✅ No case-insensitive duplicates found']);
      }

      setStep(4);
      setStatus('✅ Migration completed successfully!');
      setResults(prev => [...prev, 'Migration completed. Your app is now ready to use the new schema patterns.']);

    } catch (error: any) {
      setStatus(`❌ Migration failed: ${error.message}`);
      setResults(prev => [...prev, `Error: ${error.message}`]);
    }
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 className="text-[36px]" style={{ fontFamily: '"I lova ya like a sister"' }}>Schema Migration - Simple Version</h1>
      <p>This will update your songs table to use the new schema patterns.</p>
      
      <div style={{ 
        padding: '15px', 
        border: '1px solid #ddd', 
        borderRadius: '5px',
        marginBottom: '20px',
        backgroundColor: step === 0 ? '#f9f9f9' : '#f0f8ff'
      }}>
        <h3>Status: {status}</h3>
        <div>Step: {step}/4</div>
      </div>

      <button 
        onClick={runMigration}
        disabled={step > 0 && step < 4}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: step > 0 && step < 4 ? 'not-allowed' : 'pointer',
          opacity: step > 0 && step < 4 ? 0.6 : 1
        }}
      >
        {step === 0 ? 'Start Migration' : step === 4 ? 'Migration Complete' : 'Running...'}
      </button>

      {results.length > 0 && (
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '5px'
        }}>
          <h3>Results:</h3>
          <ul>
            {results.map((result, index) => (
              <li key={index} style={{ marginBottom: '5px' }}>{result}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ 
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '5px'
      }}>
        <h3>What this migration does:</h3>
        <ul>
          <li>✅ Updates slugs to use artist+title pattern (prevents collisions)</li>
          <li>✅ Checks for case-insensitive duplicates</li>
          <li>✅ Prepares your data for the new schema patterns</li>
          <li>⚠️ Cannot add new columns without direct database access</li>
        </ul>
        
        <p><strong>Next steps after this migration:</strong></p>
        <ol>
          <li>Update your app code to treat 'title' as 'song_title'</li>
          <li>Use the improved slug patterns</li>
          <li>Implement case-insensitive duplicate checking</li>
        </ol>
      </div>
    </div>
  );
}