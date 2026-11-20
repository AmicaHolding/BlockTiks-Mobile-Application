import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, api, setOrgId } from '../lib/api';
import { useOrg } from '../lib/org';
import { Button, Card, LoadingBlock, PageHeader } from '../components/ui';

/**
 * I7: an invite host lands here from the fan app ("Sell tickets instead") to
 * convert their invite into a paid Studio event. POST /invites/{id}/move
 * {org_id} → the draft event, then hand off to its edit page.
 */
export default function MoveInvitePage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const { orgs, ready } = useOrg();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Only orgs the user administers can receive the converted event.
  const { memberships } = useOrg();
  const adminOrgs = orgs.filter((o) =>
    memberships.some((m) => m.org_id === o.id && m.role === 'admin' && m.status !== 'invited'),
  );

  useEffect(() => {
    if (ready && adminOrgs.length === 0) {
      setError('You need an organisation where you are admin to host this event.');
    }
  }, [ready, adminOrgs.length]);

  function move(orgId: string) {
    if (!inviteId) return;
    setBusy(orgId);
    setError('');
    api
      .moveInvite(inviteId, orgId)
      .then((res) => {
        setOrgId(orgId);
        navigate(res.studio_path ?? `/events/${res.event_id}`, { replace: true });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === 'already_moved') {
          setError('This invite was already converted.');
        } else {
          setError(err instanceof ApiError ? err.message : 'Could not convert the invite.');
        }
        setBusy(null);
      });
  }

  if (!ready) return <LoadingBlock label="Loading your organisations…" />;

  return (
    <div>
      <PageHeader
        title="Turn this invite into an event"
        subtitle="Pick the organisation that hosts it. The invite's details become a draft event you finish in Studio."
      />
      <div className="grid max-w-2xl gap-3">
        {adminOrgs.map((o) => (
          <Card key={o.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-night">{o.name}</p>
              <p className="text-xs text-ink/50">
                {o.city} · {o.verificationStatus}
              </p>
            </div>
            <Button small onClick={() => move(o.id)} disabled={busy !== null}>
              {busy === o.id ? 'Converting…' : 'Host it here'}
            </Button>
          </Card>
        ))}
      </div>
      {error ? (
        <div className="mt-4">
          <p className="text-sm font-medium text-rumman">{error}</p>
          {adminOrgs.length === 0 ? (
            <Button small variant="outline" onClick={() => navigate('/setup')}>
              Create an organisation
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
