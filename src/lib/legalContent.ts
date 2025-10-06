export interface LegalSection { title: string; paragraphs: string[]; }

export const TERMS_LAST_UPDATED = 'October 6, 2025';
export const PRIVACY_LAST_UPDATED = 'October 6, 2025';

export const termsSections: LegalSection[] = [
  { title: '1. Purpose', paragraphs: ['Stageheart is a tool for singers to practice, share and discover voices. We do not sell or distribute your recordings outside the app.']},
  { title: '2. Your Responsibility for Content', paragraphs: [
    'You keep all rights to the audio you create and upload.',
    'By uploading, you confirm you own or have the legal right to use all parts of your recording, including any instrumental, karaoke or backing tracks.',
    'If you use third-party material (e.g. karaoke), you are responsible for making sure you have the necessary permission or licence.'
  ]},
  { title: '3. Licence to Stageheart', paragraphs: ['You grant Stageheart a non-exclusive, worldwide, free licence to store, stream and display your uploaded audio within the app so it can work as intended. We do not sell or sublicense your content.']},
  { title: '4. Copyright & Takedown', paragraphs: ['If someone believes their copyright is infringed, they can contact us with details of the work and the allegedly infringing content. We will review and may remove the content.']},
  { title: '5. Private vs Public Sharing', paragraphs: ['You choose whether your recordings are private or public (“Voices”). Making content public means anyone on Stageheart can listen.']},
  { title: '6. Prohibited Use', paragraphs: ['Do not upload illegal, offensive, or infringing content. We may remove recordings or suspend accounts if we reasonably believe they violate these terms.']},
  { title: '7. Liability', paragraphs: ['Stageheart provides this service “as is.” We do not guarantee uninterrupted availability. We are not liable for copyright claims relating to content you upload.']},
  { title: '8. Swiss Law', paragraphs: ['These Terms are governed by Swiss law. Place of jurisdiction is Aargau.']}
];

export const privacySections: LegalSection[] = [
  { title: '1. What We Collect', paragraphs: [
    'Account data: email, display name, basic profile preferences.',
    'Favorites & categories: stored locally and/or in our database to personalize your experience.',
    'Recordings ("Voices"): if you publish or store them, we keep the audio needed to stream inside the app.',
    'Messages: for delivering and viewing direct messages.'
  ]},
  { title: '2. What We Do NOT Collect', paragraphs: ['No ad tracking pixels, no sale of personal data, no third‑party behavioral analytics at this stage.']},
  { title: '3. Storage & Retention', paragraphs: ['Data stays as long as you keep your account. Delete requests (feature forthcoming) will remove associated stored content after a short safety window.']},
  { title: '4. Security', paragraphs: ['We use Supabase managed infrastructure. Still, no system is perfect—avoid uploading sensitive information.']},
  { title: '5. Your Choices', paragraphs: [
    'Keep recordings private or publish them.',
    'Remove recordings you no longer want available.',
    'Export / delete account (coming soon).'
  ]},
  { title: '6. Contact', paragraphs: ['Questions? Email legal@stageheart.app.']}
];
