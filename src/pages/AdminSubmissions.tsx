import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Submission {
  id: string;
  title: string;
  artist: string;
  status: string;
  error: string | null;
  created_at: string;
  processed_at: string | null;
}

export default function AdminSubmissions() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('id, title, artist, status, error, created_at, processed_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerProcessing = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('process-submissions');
      if (error) throw error;
      
      // Reload after processing
      setTimeout(() => {
        loadSubmissions();
      }, 1000);
    } catch (error) {
      console.error('Error triggering processing:', error);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QUEUED': return 'text-yellow-600';
      case 'PROCESSING': return 'text-blue-600';
      case 'REVIEW': return 'text-orange-600';
      case 'PUBLISHED': return 'text-green-600';
      case 'REJECTED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto pt-8">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
          >
            ← Back to Home
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadSubmissions}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              size="sm"
              onClick={triggerProcessing}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Queue'
              )}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Song Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : submissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No submissions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Processed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.title}</TableCell>
                        <TableCell>{sub.artist}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getStatusColor(sub.status)}`}>
                            {sub.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-red-600 text-sm max-w-xs truncate">
                          {sub.error || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(sub.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {sub.processed_at ? new Date(sub.processed_at).toLocaleString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
