import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAllSongs } from '@/hooks/useAllSongs';
import { validateSongSubmission, generateSongSlug } from '@/lib/songUtils';

export default function AddSong() {
  const navigate = useNavigate();
  const { songs } = useAllSongs();
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setValidationErrors([]);

    // Validate with improved duplicate checking
    const validation = validateSongSubmission(artist, title, songs);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setLoading(true);

    try {
      // Generate the improved slug for submission
      const slug = generateSongSlug(artist, title);
      
      const { data, error } = await supabase.functions.invoke('submit-song', {
        body: { 
          artist: artist.trim(), 
          title: title.trim(),
          slug // Send the improved slug
        }
      });

      if (error) throw error;

      if (data.status === 'EXISTS') {
        setMessage({ text: 'This song is already in our library!', type: 'info' });
      } else if (data.status === 'QUEUED') {
        setMessage({ text: 'Thank you! Your suggestion has been submitted and will be processed soon.', type: 'success' });
        setArtist('');
        setTitle('');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setMessage({ text: 'Failed to submit. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          ← Back to Home
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Suggest a Song</CardTitle>
            <CardDescription>
              Help us grow Stage Heart's library by suggesting songs you'd like to see as Feeling Cards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="artist">Artist *</Label>
                <Input
                  id="artist"
                  placeholder="e.g., Otis Redding"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Song Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Sittin' on the Dock of the Bay"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" disabled={loading || validationErrors.length > 0} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Suggestion'
                )}
              </Button>
            </form>

            {validationErrors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg">
                <h3 className="font-semibold mb-2">Please fix these issues:</h3>
                <ul className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm">• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {message && (
              <div className={`mt-4 p-3 rounded text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {message.text}
              </div>
            )}

            <p className="mt-6 text-xs text-muted-foreground space-y-1">
              <span className="block">We only store the title and artist to generate a feeling-first card. No lyrics or media files are uploaded.</span>
              <span className="block">By submitting, you confirm you have the right to request this song.
                {' '}<a href="/terms" className="underline underline-offset-2">Read full Terms</a>.</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
