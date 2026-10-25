---
name: onchain-strategy-extraction
description: Extract the working strategy of a profitable on-chain trader or bot from public evidence, combining StalkChain behavior data with REA EVM bytecode analysis and verifying every claim in both directions. Use for "how does this bot/whale trade", "which leaderboard accounts are bots", "what does this MEV contract do", or copy-trade due diligence. Read-only; never trades, signs, or broadcasts.
---

# On-chain strategy extraction

Turn a leaderboard row, wallet, or contract into a strategy card whose every
line is labeled observed, derived, inferred, or unknown. Behavior data says
what an account does; bytecode says what a contract can do. Neither alone
establishes a strategy, so each claim is closed from the opposite side before
it is reported.

Authority: public chain and API data only. Do not execute target contracts,
simulate transactions against live state, sign, trade, or set alerts unless
the user asks. Never write API keys or RPC credentials to files or output.

## Tools this skill expects

- StalkChain MCP (`mcp__stalkchain__*`), connected as a claude.ai connector.
  If its tools are absent, stop and ask the user to connect it; do not mock data.
- REA MCP (`inspect_evm_interface`) or the CLI from this checkout:
  `node scripts/rea.mjs inspect-evm-interface <path> hex --format json`.
  A fresh cloud session builds it through the SessionStart hook.
- `scripts/fetch-runtime-code.mjs` (eth_getCode to a hex carrier) and
  `scripts/evm-bot-profile.mjs` (guards, non-ABI dispatch, embedded venue
  selectors) in this skill directory.

## Order of work (highest leverage first)

1. **Discover with one cheap call per venue.** `stalkchain_perps_leaderboard`
   (Hyperliquid) and `stalkchain_fomo_leaderboard` (social spot traders)
   return the whole board; ask for 10 rows. Lookups consume the user's plan, so
   prefer userId over handle and never repeat a call whose result you hold.
2. **Classify before deep-diving.** From leaderboard fields alone:
   - turnover = monthly volume / account value. Above ~50x is market-making or
     HFT; below ~5x is directional position trading.
   - trades per day, win rate against total PnL (a low win rate with large PnL
     means trend-following with cut losers), fee per notional (maker-side
     rebate levels point to passive execution).
     Pick at most two candidates per class.
3. **Pull behavior for each candidate.** `stalkchain_perps_wallet` for a
   Hyperliquid address (positions, leverage, fill slicing, funding paid);
   `stalkchain_fomo_trader_report` for a tracked trader.
4. **Close the loop in the opposite direction.** A claim survives only when a
   second independent read agrees:
   - leaderboard row → wallet query: account value and activity dates must
     match. A mismatch means a vault, subaccount, or agent wallet; report it as
     unresolved instead of profiling the wrong account.
   - contract → owner: fetch runtime code, run REA, then run
     `evm-bot-profile.mjs`; check every embedded address with
     `stalkchain_wallet_age` (age, transaction count) and, if needed,
     `stalkchain_wallet_portfolio`.
   - owner → contract: for an EOA operator, `fetch-runtime-code.mjs` returns
     `eoa-or-empty`; then look for the contracts it calls via
     `stalkchain_wallet_transfers`.
5. **Write the strategy card** (template below) and keep the raw JSON that
   backs each line in the session scratchpad.

## Reading bot bytecode

Run REA first; it owns selector inference and Evidence provenance. An empty
`functions` list does not mean there is no interface: MEV contracts commonly
skip the 4-byte ABI. Then run the profiler:

```bash
node .claude/skills/onchain-strategy-extraction/scripts/fetch-runtime-code.mjs <0xaddr> /tmp/bot.hex
node scripts/rea.mjs inspect-evm-interface /tmp/bot.hex hex --format json
node .claude/skills/onchain-strategy-extraction/scripts/evm-bot-profile.mjs /tmp/bot.hex
```

Interpret:

| Profiler fact                                     | Strategy meaning (inference)                               |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `callerAllowlist` + embedded address              | Private bot; only that operator can call it                |
| `blockBoundCallValue`                             | Tx only valid in the targeted block: bundle-only execution |
| first-calldata-byte jump table                    | Gas-golfed custom opcodes instead of ABI selectors         |
| V2 `swap` / V3 `swap` selectors, WETH wrap/unwrap | Direct pool routing across Uniswap-style venues            |
| `COINBASE` present                                | Likely pays the block builder directly (priority bribe)    |
| `TLOAD`/`TSTORE` present                          | Post-Cancun build using transient storage                  |

Opcode counts come from a linear sweep that also decodes code-data, so treat
them as upper bounds. Raw selector hits prove embedded bytes, not reachable
calls. Say so in the card.

## Known pitfalls

- Leaderboard identities can point at a different account than the one that
  holds the capital. Always run step 4's leaderboard → wallet check.
- `stalkchain_fomo_trader_report` in search mode may return null PnL and a
  small closed-position sample; state the sample size, and retry the
  spotlight part 30–60 s later instead of calling other tools to fill gaps.
- Hyperliquid keeps only the most recent 10,000 fills; positions flagged
  `openedBeforeRecords` have partial entries but complete realized PnL.
- Provider-claimed wallets are leads, not proof; only `onchain-holdings`
  evidence is verified.
- Public RPCs serve `latest` state. Record the block or time of each read.

## Strategy card template

```markdown
### <label> — <address or handle> (read <UTC time>)

- Class: <market-maker | directional | MEV/arbitrage | sniper | unknown>
- Edge: <one sentence> [inferred]
- Execution: <order slicing, venues, leverage, bundle-only, ...> [observed/derived]
- Risk: <leverage, liquidation distance, funding paid, concentration> [observed]
- Verification: <which opposite-direction check passed or failed>
- Unknowns: <what the evidence cannot establish>
```

Dated worked examples live in
[references/case-studies.md](references/case-studies.md). They are snapshots,
not current state; re-read live data before relying on them.
