-- Temporary INSERT policies for migration
CREATE POLICY "Songs insert (temp migration)" ON public.songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Feeling cards insert (temp migration)" ON public.feeling_cards FOR INSERT WITH CHECK (true);