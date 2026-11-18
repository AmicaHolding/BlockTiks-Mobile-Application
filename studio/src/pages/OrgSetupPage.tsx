import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type User } from '../lib/api';
import { Button, Chip, Field, Input } from '../components/ui';

const CITIES = ['Dubai', 'Abu Dhabi', 'Riyadh', 'Doha'];
const TYPES = ['Promoter', 'Venue', 'Artist', 'Community'];

export default function OrgSetupPage({
  user,
  hasOrgs,
  onCreated,
}: {
  user: User;
  hasOrgs: boolean;
  onCreated: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [city, setCity] = useState('Dubai');
  const [type, setType] = useState('Promoter');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give your organisation a name.');
      return;
    }
    const res = api.createOrg({
      ownerUserId: user.id,
      ownerEmail: user.email,
      ownerName: `${user.firstName} ${user.lastName ?? ''}`.trim(),
      name: name.trim(),
      type,
      city,
    });
    if ('error' in res) {
      setError(`You're already in an organisation called ${name.trim()}.`);
      return;
    }
    onCreated();
    navigate('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center gap-3">
          <img src="/brand/sahra-logo-night.png" alt="Sahra" className="h-9 w-9" />
          <span className="font-display text-2xl font-bold text-night">Sahra Studio</span>
        </div>

        <div className="rounded-2xl border border-dune bg-white p-8 shadow-[0_2px_12px_rgba(22,38,59,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
            {hasOrgs ? 'New organisation' : 'Step 2 of 2 · Organisation'}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-night">Who's hosting?</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink/55">
            The name fans see on your events. Your team joins this, not your personal account.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-6">
            <Field label="Organisation name" error={error}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="Mirage Live"
              />
            </Field>

            <Field label="Based in">
              <div className="flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <Chip key={c} selected={city === c} onClick={() => setCity(c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="What describes you best?">
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <Chip key={t} selected={type === t} onClick={() => setType(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </Field>

            <div className="rounded-xl border border-dune bg-sand p-4 text-sm leading-relaxed text-ink/60">
              This is the name fans see on tickets and listings. You can create more than one
              organisation, a promoter and a venue might both be you.
            </div>

            <Button type="submit">Create organisation</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
