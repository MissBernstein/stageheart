import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AddSong() {
  const navigate = useNavigate();
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-song', {
        body: { artist, title }
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

              <Button type="submit" disabled={loading} className="w-full">
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

            {message && (
              <div className={`mt-4 p-3 rounded text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {message.text}
              </div>
            )}

            <p className="mt-6 text-xs text-muted-foreground">
              We only store the title and artist to generate a feeling-first card. 
              No lyrics or media files are uploaded.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
