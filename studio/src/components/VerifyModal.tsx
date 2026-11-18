import { useState } from 'react';
import { api } from '../lib/api';
import { useOrg } from '../lib/org';
import { Button, Field, Input, Modal } from './ui';

/**
 * Verification modal, spec POST /orgs/{id}/verification {legal_name,
 * licence_no, docs[]}. The doc upload endpoint does not exist yet:
 * TODO(api-gap): PUT/POST /orgs/{id}/verification accepts licence images;
 * the file picker below keeps the chosen names client-side only.
 */
export default function VerifyModal({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { org, refresh } = useOrg();
  const [legalName, setLegalName] = useState(org?.legalName ?? '');
  const [licenceNo, setLicenceNo] = useState(org?.tradeLicenceNo ?? '');
  const [docs, setDocs] = useState<string[]>([]);
  const [error, setError] = useState('');

  if (!org) return null;

  function submit() {
    if (!legalName.trim()) {
      setError('Add the legal name on your trade licence.');
      return;
    }
    if (!licenceNo.trim()) {
      setError('Add your trade licence number.');
      return;
    }
    api.submitVerification(org!.id, {
      legalName: legalName.trim(),
      licenceNo: licenceNo.trim(),
    });
    refresh();
    onSubmitted();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Verify ${org.name}`}>
      <p className="text-sm leading-relaxed text-ink/60">
        We check this once so fans know you're real. It takes a day or two.
      </p>
      <div className="mt-5 space-y-4">
        <Field label="Legal name" hint="Exactly as it appears on the trade licence.">
          <Input
            value={legalName}
            onChange={(e) => {
              setLegalName(e.target.value);
              setError('');
            }}
            placeholder="Mirage Live Events LLC"
          />
        </Field>
        <Field label="Trade licence no.">
          <Input
            value={licenceNo}
            onChange={(e) => {
              setLicenceNo(e.target.value);
              setError('');
            }}
            placeholder="1234567"
          />
        </Field>
        <Field label="Licence document" hint="PDF or photo of the trade licence.">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-ink/25 bg-white px-4 py-5 text-sm text-ink/50 hover:border-ink/40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M17 8l-5-5-5 5" />
              <path d="M12 3v12" />
            </svg>
            {docs.length > 0 ? docs.join(', ') : 'Upload trade licence'}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const names = Array.from(e.target.files ?? []).map((f) => f.name);
                setDocs(names);
              }}
            />
          </label>
        </Field>
      </div>
      <div className="mt-5 rounded-xl border border-dune bg-sand p-3.5 text-xs leading-relaxed text-ink/55">
        Dubai venues check licences at the gate, this has to match.
      </div>
      {error ? <p className="mt-3 text-sm font-medium text-rumman">{error}</p> : null}
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Not yet
        </Button>
        <Button onClick={submit}>Submit for verification</Button>
      </div>
    </Modal>
  );
}
