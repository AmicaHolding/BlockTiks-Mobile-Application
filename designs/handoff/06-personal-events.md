# Personal events (invites): parity update (20 Nov 2026)

Prototypes: `Sahra Mobile Prototype v3.dc.html` and `Sahra Web Prototype v3.dc.html`. Both ask the same questions and store the same data. Where this file disagrees with 03-rules.md (I-rules), this file wins.

## What the host fills in (same on mobile and web)
| Field | Required | Notes |
|---|---|---|
| Title | yes | 2+ characters |
| Cover | no | Uploaded image or flyer (JPG/PNG/HEIC, resized server-side). If none, a colour from 5 presets. No font picker. |
| When | yes | **One date** (date + start time) **or a date poll** (2 to 4 options) |
| Where | yes | Free text address or place name. Can be hidden until Going (I6). |
| Description | no | Free text, line breaks kept. Covers links, dress code, what to bring, etc. (no separate add-ons) |
| RSVP by | no | None / day before / 3 days before / week before |
| Guest limit | no | 0 = unlimited; steps of 5, max 300; includes plus-ones |
| RSVP buttons | yes (default Words) | Words, Emoji or Custom labels (≤16 chars each). Labels are display only; stored state is always going / maybe / no. |
| Reminders | no | Any of: week before, day before, 2 hours before. Default: day before + 2 hours before. |
| Approve each guest | no | default off |
| Allow plus-ones | no | default on, up to 2 |
| Show guest list | no | default on |
| Hide address until going | no | default on |

"Hosted by" is always the creator. Co-hosts are not in scope.

## Rules (PE)
- **PE1** **Personal RSVPs can never be sold, transferred or resold.** No Send or Sell action exists for invites, and plus-one spots belong to the guest who added them. Guests can only change their own RSVP and plus-one count.
- **PE2** Guests can change their RSVP any time until the RSVP-by date. After it, only a change to *Can't go* is allowed. The host can still edit anything.
- **PE3** RSVP-by date = event date minus the chosen offset (venue time, end of day). With a poll, it counts back from the date the host locks in.
- **PE4** Date poll: guests (any signed-in invitee) vote for any number of options; the host sees vote counts and taps *Lock in*. Locking sets the date, closes voting, posts a host blast to Activity and notifies everyone invited. Until then the invite shows "Date to be decided" and can't be added to a calendar.
- **PE5** Activity feed: host blasts (I8) and guest comments in one list, newest first. Anyone invited and signed in can comment, like and reply (one level). The host can delete any comment; authors can delete their own. Visible only to invitees.
- **PE6** Photo album: the host and Going guests can add photos; everyone invited can view. *Share album* copies a link that works only for people on the guest list. Max 200 photos per event, 20 per upload.
- **PE7** Guest list: shows Going and Maybe (with plus-ones) to guests when *Show guest list* is on; the host also sees Can't go and pending requests.
- **PE8** Reminders go to Going + Maybe by push, or SMS for non-app guests, at each selected offset.
- **PE9** Add to calendar is offered once a date is set to the host, Going and Maybe guests (.ics on web, native sheet on mobile). Open map uses the address and is hidden while the address is hidden.
- **PE10** After the event, the invite moves to "Been to" in Plans. The guest bar reads "You went"; Activity and Album stay open.

## Data model additions (Invite)
`cover_image_url?`, `cover_colour`, `rsvp_deadline` (`none|1d|3d|1w`), `rsvp_labels {going,maybe,no}` + `rsvp_style` (`words|emoji|custom`), `reminders[]`, `date_poll_id?`
- **DatePoll**: id, invite_id, options[{id, starts_at}], locked_option_id?, locked_at
- **DateVote**: poll_option_id, user_id (unique pair)
- **InvitePost** (replaces InviteUpdate): id, invite_id, author_id, kind `blast|comment`, body (≤300), parent_id? (replies), created_at, deleted_at
- **InvitePostLike**: post_id, user_id
- **InvitePhoto**: id, invite_id, uploader_id, url, created_at, deleted_at

## Out of scope for now (future list)
- Who can find it (public or discoverable personal events). Today: private link only.
- Questions for guests when they RSVP.
- Co-hosts and a custom host name.
- Cost per person / chip-in.
- Link, playlist, registry and dress-code add-ons (use the description).
- Themes, effects and title fonts.
