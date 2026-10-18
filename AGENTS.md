<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All app data flows through `src/lib/store.ts` actions (local browser store for now); components never mutate data directly, so a real backend (D1/API) can replace the store without UI changes.
- Movie/series pages share one `TitlePage` + reusable `Composer` driven by `src/lib/tabs.ts`; add tabs there, not in components.
- Catalog search lives in `src/lib/search.ts` (normalized prefix + fuzzy ranking) so the ranking can be mirrored server-side later.
- Clerk is the only live authentication authority; sync verified profiles from Clerk into D1 and install returned users through store actions so a missing snapshot row cannot hide a signed-in account.
- Resolve external Worker bindings from Nitro's request.runtime.cloudflare.env, with the direct Worker env argument as a fallback, because Nitro does not forward bindings as the TanStack entry's second argument.
- Keep source Cloudflare bindings in wrangler.jsonc and deploy Nitro's generated Wrangler configuration so compiled entry and asset paths remain correct.
