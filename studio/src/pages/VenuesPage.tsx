import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type StudioEvent, type VenueSection } from '../lib/api';
import { useOrg } from '../lib/org';
import { venueSeatedCapacity, type LocalVenue, type VenueSectionDraft } from '../lib/store';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  PageHeader,
  Stepper,
  ToastHost,
  useToasts,
} from '../components/ui';

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export default function VenuesPage() {
  const { org } = useOrg();
  const { toasts, push } = useToasts();
  const [params, setParams] = useSearchParams();
  const [venues, setVenues] = useState<LocalVenue[] | null>(null);
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('venue'));
  const [selSection, setSelSection] = useState<string | null>(null);
  const [draft, setDraft] = useState<LocalVenue | null>(null);
  const [busy, setBusy] = useState(false);
  const [newVenueOpen, setNewVenueOpen] = useState(false);
  const [nvName, setNvName] = useState('');
  const [nvKind, setNvKind] = useState<'ga' | 'seated'>('ga');
  const [nvCap, setNvCap] = useState('400');

  // Load events → derive venues from real venueLayout + stored venues.
  useEffect(() => {
    if (!org) return;
    api
      .myEvents()
      .then(({ events: evts }) => {
        setEvents(evts);
        evts.forEach((e) => api.upsertVenueFromEvent(org.id, e));
        const list = api.venues(org.id);
        setVenues(list);
        const want = params.get('event');
        if (want) {
          const match = list.find((v) => v.sourceEventId === want || v.name === evts.find((x) => x.id === want)?.location);
          setSelectedId(match?.id ?? list[0]?.id ?? null);
        } else if (!selectedId) {
          setSelectedId(list[0]?.id ?? null);
        }
      })
      .catch(() => setVenues([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  const venue = useMemo(
    () => (draft ? draft : (venues ?? []).find((v) => v.id === selectedId) ?? null),
    [draft, venues, selectedId],
  );

  // Keep the editable draft in sync with the *stored* venue for the
  // selected tab, the draft only re-syncs when the store changes (e.g.
  // after a save), so in-flight edits aren't clobbered.
  useEffect(() => {
    const source = (venues ?? []).find((v) => v.id === selectedId) ?? null;
    setDraft(source ? (JSON.parse(JSON.stringify(source)) as LocalVenue) : null);
    setSelSection(source?.sections[0]?.id ?? null);
  }, [selectedId, venues]);

  const usedBy = useMemo(
    () => (venue ? events.filter((e) => e.location === venue.name) : []),
    [venue, events],
  );

  const tierTotal = useMemo(
    () => usedBy.reduce((a, e) => a + (e.tiers ?? []).reduce((s, t) => s + t.quantity, 0), 0),
    [usedBy],
  );

  if (!org || venues === null) return <LoadingBlock />;

  const cap = venue ? venueSeatedCapacity(venue) : 0;
  const over = venue && cap > 0 && tierTotal > cap;
  const section = draft?.sections.find((s) => s.id === selSection) ?? null;

  function patchVenue(p: Partial<LocalVenue>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }

  function patchSection(id: string, p: Partial<VenueSectionDraft>) {
    setDraft((d) =>
      d ? { ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, ...p } : s)) } : d,
    );
  }

  async function save() {
    if (!draft || !org) return;
    setBusy(true);
    try {
      // TODO(api-gap): PUT /venues/{id}/layout, venues aren't entities yet;
      // when this venue mirrors an event layout we PATCH the event (real).
      if (draft.sourceEventId && draft.sections.length > 0) {
        const sections: VenueSection[] = draft.sections.map((s) => ({
          id: s.id,
          name: s.name,
          priceCents: s.priceMinor,
          capacity: s.rows * s.seatsPerRow,
          rows: s.rows,
          seatsPerRow: s.seatsPerRow,
          accessibleCount: s.accessibleCount,
          heldCount: s.heldCount,
        }));
        await api.updateVenueLayout(draft.sourceEventId, sections);
      }
      api.saveVenue(org.id, draft);
      setVenues(api.venues(org.id));
      push('Layout saved.');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Save failed.', 'danger');
    } finally {
      setBusy(false);
    }
  }

  function createVenue() {
    if (!nvName.trim() || !org) return;
    const v = api.saveVenue(org.id, {
      id: uid('ven'),
      name: nvName.trim(),
      kind: nvKind,
      capacity: nvKind === 'ga' ? Number(nvCap) || 0 : 0,
      timezone: 'Asia/Dubai',
      sections:
        nvKind === 'seated'
          ? [{ id: uid('sec'), name: 'Section A', rows: 5, seatsPerRow: 10, priceMinor: 10000 }]
          : [],
    });
    setVenues(api.venues(org.id));
    setSelectedId(v.id);
    setNewVenueOpen(false);
    setNvName('');
  }

  return (
    <div>
      <PageHeader
        title="Venues"
        subtitle="Each tier needs a seat map or a capacity, pick the venue when you create the event."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setNewVenueOpen(true)}>
              + New venue
            </Button>
            {venue ? (
              <Button loading={busy} onClick={save}>
                Save layout
              </Button>
            ) : null}
          </div>
        }
      />

      {venues.length === 0 ? (
        <EmptyState
          title="No venues yet"
          body="Venues appear here when you create events, or add one now."
          action={<Button onClick={() => setNewVenueOpen(true)}>+ New venue</Button>}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {venues.map((v) => (
              <Chip
                key={v.id}
                selected={venue?.id === v.id}
                onClick={() => {
                  setSelectedId(v.id);
                  setParams({ venue: v.id });
                }}
              >
                {v.name}
              </Chip>
            ))}
          </div>

          {venue && draft ? (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-4 text-sm text-ink/55">
                <Badge tone="night" className="capitalize">
                  {venue.kind === 'seated' ? 'Seated' : 'Standing'}
                </Badge>
                <span>
                  Capacity <strong className="text-ink tabular-nums">{cap.toLocaleString()}</strong>
                </span>
                {usedBy.length > 0 ? (
                  <span>
                    · Used by {usedBy.map((e) => e.title).join(', ')}
                  </span>
                ) : (
                  <span className="text-ink/40">· Not used by any event yet</span>
                )}
              </div>

              {over ? (
                <div className="mb-5 rounded-xl border border-rumman/30 bg-rumman/5 px-5 py-3.5 text-sm text-rumman">
                  Tiers on sale ({tierTotal.toLocaleString()}) exceed this layout
                  ({cap.toLocaleString()}). Fix the tiers or the layout before the event.
                </div>
              ) : null}

              {venue.kind === 'ga' ? (
                <Card title="Standing venue" className="max-w-lg">
                  <p className="mb-4 text-sm text-ink/60">
                    Standing venue, capacity is a single number. Fans don't pick seats.
                  </p>
                  <Field label="Capacity">
                    <Input
                      className="w-32"
                      inputMode="numeric"
                      value={draft.capacity || ''}
                      onChange={(e) =>
                        patchVenue({ capacity: Number(e.target.value.replace(/\D/g, '')) || 0 })
                      }
                    />
                  </Field>
                  <Field label="Timezone" hint="Event times display in the venue timezone.">
                    <Input
                      className="w-64"
                      value={draft.timezone}
                      onChange={(e) => patchVenue({ timezone: e.target.value })}
                    />
                  </Field>
                </Card>
              ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Sections */}
                  <Card title="Sections" action={<span className="text-xs text-ink/40 tabular-nums">{draft.sections.reduce((a, s) => a + s.rows * s.seatsPerRow, 0).toLocaleString()} seats</span>}>
                    <div className="space-y-1.5">
                      {draft.sections.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelSection(s.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                            selSection === s.id ? 'bg-gold/20 font-semibold text-ink' : 'text-ink/70 hover:bg-sand'
                          }`}
                        >
                          <span>{s.name}</span>
                          <span className="text-xs text-ink/45 tabular-nums">
                            {s.rows * s.seatsPerRow}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const s: VenueSectionDraft = {
                          id: uid('sec'),
                          name: `Section ${String.fromCharCode(65 + draft.sections.length)}`,
                          rows: 4,
                          seatsPerRow: 10,
                          priceMinor: 10000,
                        };
                        patchVenue({ sections: [...draft.sections, s] });
                        setSelSection(s.id);
                      }}
                      className="mt-3 text-sm font-semibold text-ink underline underline-offset-2"
                    >
                      + Section
                    </button>
                  </Card>

                  {/* Map visual */}
                  <Card title="Layout">
                    <div className="mb-4 rounded-lg bg-ink/90 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-sand/70">
                      Stage
                    </div>
                    <div className="flex flex-wrap items-start justify-center gap-2">
                      {draft.sections.map((s) => {
                        const seats = s.rows * s.seatsPerRow;
                        const w = Math.max(14, Math.min(100, Math.round((seats / Math.max(1, cap)) * 200)));
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelSection(s.id)}
                            title={`${s.name}, ${seats} seats`}
                            className={`flex flex-col items-center justify-center rounded-lg border-2 px-2 py-3 text-[10px] font-semibold transition-colors ${
                              selSection === s.id
                                ? 'border-gold bg-gold/20 text-ink'
                                : 'border-dune bg-sand text-ink/60 hover:border-ink/25'
                            }`}
                            style={{ width: `${w}%`, minWidth: '64px', minHeight: '44px' }}
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="tabular-nums opacity-60">{seats}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-4 text-center text-xs text-ink/40">
                      {draft.sections.length} sections · {cap.toLocaleString()} seats
                    </p>
                  </Card>

                  {/* Section editor */}
                  <Card title={section ? section.name : 'Pick a section'}>
                    {section ? (
                      <div className="space-y-5">
                        <Field label="Section name">
                          <Input
                            value={section.name}
                            onChange={(e) => patchSection(section.id, { name: e.target.value })}
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Rows">
                            <Stepper
                              value={section.rows}
                              min={1}
                              max={60}
                              onChange={(v) => patchSection(section.id, { rows: v })}
                            />
                          </Field>
                          <Field label="Seats per row">
                            <Stepper
                              value={section.seatsPerRow}
                              min={1}
                              max={60}
                              onChange={(v) => patchSection(section.id, { seatsPerRow: v })}
                            />
                          </Field>
                        </div>
                        <p className="text-sm text-ink/60">
                          Seats total{' '}
                          <strong className="text-ink tabular-nums">
                            {(section.rows * section.seatsPerRow).toLocaleString()}
                          </strong>
                        </p>
                        <Field label={`Price (${org.currency.toUpperCase()})`}>
                          <Input
                            className="w-32"
                            inputMode="decimal"
                            value={section.priceMinor / 100 || ''}
                            onChange={(e) =>
                              patchSection(section.id, {
                                priceMinor: Math.round(parseFloat(e.target.value || '0') * 100) || 0,
                              })
                            }
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Accessible seats">
                            <Input
                              inputMode="numeric"
                              value={section.accessibleCount ?? ''}
                              onChange={(e) =>
                                patchSection(section.id, {
                                  accessibleCount: Number(e.target.value.replace(/\D/g, '')) || 0,
                                })
                              }
                            />
                          </Field>
                          <Field label="Held seats">
                            <Input
                              inputMode="numeric"
                              value={section.heldCount ?? ''}
                              onChange={(e) =>
                                patchSection(section.id, {
                                  heldCount: Number(e.target.value.replace(/\D/g, '')) || 0,
                                })
                              }
                            />
                          </Field>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            patchVenue({ sections: draft.sections.filter((s) => s.id !== section.id) });
                            setSelSection(null);
                          }}
                          className="text-sm font-semibold text-rumman underline underline-offset-2"
                        >
                          Delete section
                        </button>
                      </div>
                    ) : (
                      <p className="py-6 text-center text-sm text-ink/45">
                        Select a section on the left to edit it.
                      </p>
                    )}
                  </Card>
                </div>
              )}
            </>
          ) : null}
        </>
      )}

      {/* New venue mini form */}
      {newVenueOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-night/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && setNewVenueOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-sand p-7 shadow-2xl">
            <h2 className="font-display text-xl font-bold text-night">New venue</h2>
            <div className="mt-5 space-y-4">
              <Field label="Venue name">
                <Input value={nvName} onChange={(e) => setNvName(e.target.value)} placeholder="Dubai Opera House" />
              </Field>
              <Field label="Kind">
                <div className="flex gap-2">
                  <Chip selected={nvKind === 'ga'} onClick={() => setNvKind('ga')}>Standing</Chip>
                  <Chip selected={nvKind === 'seated'} onClick={() => setNvKind('seated')}>Seated</Chip>
                </div>
              </Field>
              {nvKind === 'ga' ? (
                <Field label="Capacity">
                  <Input className="w-32" inputMode="numeric" value={nvCap} onChange={(e) => setNvCap(e.target.value.replace(/\D/g, ''))} />
                </Field>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setNewVenueOpen(false)}>Cancel</Button>
              <Button onClick={createVenue} disabled={!nvName.trim()}>Create</Button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastHost toasts={toasts} />
    </div>
  );
}
