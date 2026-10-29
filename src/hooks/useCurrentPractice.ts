import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';

export const useCurrentPractice = () => {
  const [practiceId, setPracticeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPracticeId = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.id) {
          console.log('No user session found');
          return null;
        }

        console.log('Fetching practice for user:', session.user.id);

        // First, let's log the structure
        const { data: practiceData, error: structureError } = await supabase
          .from('practices')
          .select('*')
          .limit(1);

        console.log('Practice table structure:', practiceData);

        if (structureError) {
          console.error('Error fetching practice structure:', structureError);
          return;
        }

        // Then try to find the specific practice
        const { data, error } = await supabase
          .from('practices')
          .select('id')
          .eq('id', session.user.id)  // trying with 'id' instead of 'practice_id'
          .single();

        if (error) {
          console.error('Error fetching practice:', error);
          return;
        }

        console.log('Found practice:', data);
        setPracticeId(data?.id);
      } catch (error) {
        console.error('Error in fetchPracticeId:', error);
      }
    };

    fetchPracticeId();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchPracticeId();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return practiceId;
}; 