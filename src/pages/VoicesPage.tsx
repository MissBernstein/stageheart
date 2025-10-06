// Main discovery page for voice recordings
import React, { useState, useEffect } from 'react';
import { Search, Filter, Play, Heart, Share2 } from 'lucide-react';
import messagesIcon from '../assets/messagesicon.png';
import voicesIcon from '../assets/feelingjourneyicon.png';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/Toast';
import { usePlayer } from '../hooks/usePlayer';
import { theme } from '../styles/theme';
import { Recording } from '../types/voices';

export const VoicesPage: React.FC = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { addToast } = useToast();
  const { loadRecording, currentRecording, isPlaying } = usePlayer();

  // Mock data for now - replace with actual API call
  useEffect(() => {
    const fetchRecordings = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual Supabase query
        const mockRecordings: Recording[] = [
          {
            id: '1',
            user_id: 'user1',
            title: 'Morning Reflection',
            duration_sec: 180,
            mood_tags: ['peaceful', 'contemplative'],
            voice_type: 'soft',
            language: 'en',
            is_signature: true,
            state: 'public',
            comments_enabled: true,
            plays_count: 42,
            reports_count: 0,
            moderation_status: 'clean',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
            user_profile: {
              id: 'user1',
              display_name: 'Sarah M.',
              about: 'Voice artist and storyteller',
              fav_genres: ['indie', 'folk'],
              favorite_artists: ['Joni Mitchell', 'Nick Drake'],
              groups: [],
              links: [],
              contact_visibility: 'after_meet',
              dm_enabled: true,
              comments_enabled: true,
              profile_note_to_listeners: 'Thank you for listening!',
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-15T10:00:00Z'
            }
          }
        ];
        
        setRecordings(mockRecordings);
        setFilteredRecordings(mockRecordings);
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Error loading recordings',
          description: 'Please try again later.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecordings();
  }, [addToast]);

  // Filter recordings based on search and mood filters
  useEffect(() => {
    let filtered = recordings;

    if (searchQuery) {
      filtered = filtered.filter(recording => 
        recording.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recording.user_profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recording.mood_tags?.some(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    if (selectedMoods.length > 0) {
      filtered = filtered.filter(recording =>
        recording.mood_tags?.some(tag => selectedMoods.includes(tag))
      );
    }

    setFilteredRecordings(filtered);
  }, [recordings, searchQuery, selectedMoods]);

  const handlePlayRecording = (recording: Recording) => {
    loadRecording(recording);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50vh',
          fontSize: theme.typography.sizes.lg,
          color: theme.colors.text.secondary,
        }}
      >
        Loading voices...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: theme.spacing.lg,
      }}
    >
      {/* Compact Header with Icon & Search */}
      <div style={{ marginBottom: theme.spacing.lg }}>
        <div style={{ display:'flex', alignItems:'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
          <img src={voicesIcon} alt="Voices" style={{ width: 40, height: 40, objectFit:'contain', filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }} />
          <div>
            <h1 style={{
              fontSize: theme.typography.sizes['2xl'],
              fontWeight: theme.typography.weights.bold,
              color: theme.colors.text.primary,
              margin:0
            }}>Discover Voices</h1>
            <p style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary,
              margin:0
            }}>Listen to authentic voice recordings and connect with their creators</p>
          </div>
        </div>
        <div style={{
          display:'flex',
          gap: theme.spacing.sm,
          alignItems:'center'
        }}>
          <div style={{ position:'relative', flex:1, maxWidth:'420px' }}>
            <Search size={20} style={{ position:'absolute', left: theme.spacing.sm, top:'50%', transform:'translateY(-50%)', color: theme.colors.text.muted }} />
            <Input
              placeholder="Search voices, moods, or creators..."
              value={searchQuery}
              onChange={(e)=> setSearchQuery(e.target.value)}
              style={{ paddingLeft:'40px' }}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={16} />
            Filters
          </Button>
        </div>
      </div>

      {/* Results */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: theme.spacing.lg,
        }}
      >
        {filteredRecordings.map((recording) => (
          <div
            key={recording.id}
            style={{
              backgroundColor: 'white',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.md,
              boxShadow: theme.shadows.sm,
              transition: 'all 0.2s ease',
            }}
            className="hover:shadow-md"
          >
            {/* Recording Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.spacing.sm,
              }}
            >
              <h3
                style={{
                  fontSize: theme.typography.sizes.lg,
                  fontWeight: theme.typography.weights.semibold,
                  color: theme.colors.text.primary,
                  margin: 0,
                }}
              >
                {recording.title}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePlayRecording(recording)}
                style={{
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  padding: 0,
                  backgroundColor: 
                    currentRecording?.id === recording.id && isPlaying 
                      ? theme.colors.primary 
                      : 'transparent',
                }}
              >
                <Play size={16} />
              </Button>
            </div>

            {/* Creator Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                marginBottom: theme.spacing.md,
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: theme.colors.surface,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: theme.typography.sizes.sm,
                  fontWeight: theme.typography.weights.semibold,
                  color: theme.colors.text.primary,
                }}
              >
                {recording.user_profile?.display_name?.charAt(0) || '?'}
              </div>
              <div>
                <div
                  style={{
                    fontSize: theme.typography.sizes.sm,
                    fontWeight: theme.typography.weights.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  {recording.user_profile?.display_name || 'Anonymous'}
                </div>
                <div
                  style={{
                    fontSize: theme.typography.sizes.xs,
                    color: theme.colors.text.muted,
                  }}
                >
                  {formatDuration(recording.duration_sec)}
                </div>
              </div>
            </div>

            {/* Mood Tags */}
            {recording.mood_tags && recording.mood_tags.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: theme.spacing.xs,
                  flexWrap: 'wrap',
                  marginBottom: theme.spacing.md,
                }}
              >
                {recording.mood_tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: theme.typography.sizes.xs,
                      padding: `2px ${theme.spacing.xs}`,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text.secondary,
                      borderRadius: theme.radius.sm,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: theme.spacing.sm,
                borderTop: `1px solid ${theme.colors.border}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  fontSize: theme.typography.sizes.xs,
                  color: theme.colors.text.muted,
                }}
              >
                <span>{recording.plays_count} plays</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: theme.spacing.xs,
                }}
              >
                <Button variant="ghost" size="sm">
                  <Heart size={14} />
                </Button>
                <Button variant="ghost" size="sm">
                  <img src={messagesIcon} alt="Messages" style={{ width:14, height:14 }} />
                </Button>
                <Button variant="ghost" size="sm">
                  <Share2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRecordings.length === 0 && !isLoading && (
        <div
          style={{
            textAlign: 'center',
            padding: theme.spacing.xl,
            color: theme.colors.text.secondary,
          }}
        >
          <p style={{ fontSize: theme.typography.sizes.lg }}>
            {searchQuery || selectedMoods.length > 0
              ? 'No voices found matching your search.'
              : 'No voice recordings available yet.'}
          </p>
        </div>
      )}
    </div>
  );
};