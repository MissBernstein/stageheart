import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TERMS_VERSION, PRIVACY_VERSION, getTermsAcceptance, getPrivacyAcceptance, recordTermsAcceptance, recordPrivacyAcceptance, needsTermsReacceptance, needsPrivacyReacceptance } from '@/lib/legal';

interface Props { dangerDelete: () => void; showDeleteConfirm: boolean; confirmDelete: () => void; cancelDelete: () => void; }

const LegalAccountPanel: React.FC<Props> = ({ dangerDelete, showDeleteConfirm, confirmDelete, cancelDelete }) => {
  const [termsRec, setTermsRec] = React.useState(getTermsAcceptance());
  const [privacyRec, setPrivacyRec] = React.useState(getPrivacyAcceptance());
  const [needsTerms, setNeedsTerms] = React.useState(needsTermsReacceptance());
  const [needsPrivacy, setNeedsPrivacy] = React.useState(needsPrivacyReacceptance());

  const acceptAll = () => { if (needsTerms) recordTermsAcceptance(TERMS_VERSION); if (needsPrivacy) recordPrivacyAcceptance(PRIVACY_VERSION); refresh(); };
  const revokeAll = () => { try { localStorage.removeItem('stageheart_terms_acceptance_v1'); } catch {}; try { localStorage.removeItem('stageheart_privacy_acceptance_v1'); } catch {}; refresh(); };
  const refresh = () => { setTermsRec(getTermsAcceptance()); setPrivacyRec(getPrivacyAcceptance()); setNeedsTerms(needsTermsReacceptance()); setNeedsPrivacy(needsPrivacyReacceptance()); };
  const row = (label: string, version: string, rec: any, needs: boolean) => (
    <div className="flex flex-col gap-1 rounded-xl border border-card-border/60 bg-input/30 p-4">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-card-foreground/80">{label}</p>
        {needs && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600">Needs acceptance</span>}
        {!needs && rec && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Accepted</span>}
      </div>
      <p className="text-[10px] text-card-foreground/60">Current version: <span className="font-mono">{version}</span></p>
      <p className="text-[10px] text-card-foreground/60">Accepted at: {rec?.acceptedAt ? new Date(rec.acceptedAt).toLocaleString() : '—'}</p>
    </div>
  );

  return (
    <motion.section key="account-combined" id="settings-panel-legalAccount" role="tabpanel" aria-labelledby="settings-tab-legalAccount" className="space-y-10" aria-describedby="account-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
      <div className="space-y-2 pb-2 border-b border-card-border/30">
        <h3 id="account-heading" className="text-lg font-semibold text-card-foreground">Account & Danger Zone</h3>
        <p className="text-sm text-card-foreground/70">Manage your account lifecycle.</p>
      </div>
      <div className="space-y-4">
        <p className="text-xs text-card-foreground/60">More sections (email change, password, export data) will appear here once backend endpoints exist.</p>
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3">
          <p className="text-xs font-semibold text-destructive tracking-wide">DANGER ZONE</p>
          <p className="text-xs text-card-foreground/70">Delete your account and all associated recordings & messages. This action cannot be undone.</p>
          <Button size="sm" variant="destructive" className="h-8 text-[11px] flex items-center gap-1" onClick={dangerDelete}><Trash2 className="w-3 h-3" /> Delete Account</Button>
        </div>
        {showDeleteConfirm && (
          <div className="p-4 rounded-xl border border-destructive bg-destructive/10 space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-xs font-semibold text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Confirm Deletion</p>
            <p className="text-[11px] text-card-foreground/70">Type <strong>DELETE</strong> below and click confirm to proceed. This cannot be undone.</p>
            <DeleteConfirmInternal onConfirm={confirmDelete} onCancel={cancelDelete} />
          </div>
        )}
      </div>
      <div className="space-y-2 pt-8 pb-2 border-t border-card-border/50 border-b border-card-border/30">
        <h3 id="legal-heading" className="text-lg font-semibold text-card-foreground">Legal Consents</h3>
        <p className="text-sm text-card-foreground/70">Review or manage your current acceptance status.</p>
      </div>
      <div className="space-y-4">
        {row('Terms of Use', TERMS_VERSION, termsRec, needsTerms)}
        {row('Privacy Policy', PRIVACY_VERSION, privacyRec, needsPrivacy)}
        <div className="flex flex-wrap gap-3 pt-2">
          <button onClick={acceptAll} disabled={!needsTerms && !needsPrivacy} className="text-xs px-4 py-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50">Accept Current</button>
          <button onClick={revokeAll} className="text-xs px-4 py-1.5 rounded-full bg-destructive/80 text-destructive-foreground hover:bg-destructive">Revoke</button>
          <button onClick={refresh} className="text-xs px-4 py-1.5 rounded-full bg-input/60 text-card-foreground hover:bg-input/70">Refresh</button>
        </div>
        <p className="text-[10px] text-card-foreground/50 leading-snug">Revoking clears local acceptance locally; you may be prompted again. Server sync is attempted automatically upon acceptance (silent).</p>
      </div>
    </motion.section>
  );
};

const DeleteConfirmInternal: React.FC<{ onConfirm: () => void; onCancel: () => void; }> = ({ onConfirm, onCancel }) => {
  const [text, setText] = useState('');
  const disabled = text !== 'DELETE';
  return (
    <div className="space-y-2">
      <input
        value={text}
        onChange={e=> setText(e.target.value.toUpperCase())}
        placeholder="Type DELETE to confirm"
        className="w-full text-[11px] px-2 py-1.5 rounded-md bg-input/50 border border-input-border focus:outline-none focus:ring-1 focus:ring-destructive/60"
      />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="destructive" disabled={disabled} className="h-7 text-[11px]" onClick={onConfirm}>Confirm</Button>
      </div>
    </div>
  );
};

export default LegalAccountPanel;
