# Case studies (read 2026-10-25, ~16:40 UTC)

Snapshots from the first verified run of this skill. Numbers are what the
tools returned at that time; re-read before relying on any of them.

## MEV contract — 0x6b75d8AF000000e20B7a7DDf000Ba900b4009A80 (Ethereum)

- Class: MEV / DEX arbitrage-sandwich executor.
- Code: 13,734 runtime bytes from `eth_getCode` at `latest`.
- REA `inspect_evm_interface` (evmole 0.9.3): `functions: []` in 1.4 s. Not a
  failure: the contract has no 4-byte ABI dispatcher.
- Entry block [observed]:
  `CALLVALUE & 0xff == NUMBER & 0xff` AND `CALLER == 0xae2fc483…1fae13`,
  else jump to revert; then `JUMP(calldata[0] << 6)`.
  - Only one operator can call it.
  - The low byte of `msg.value` must equal the low byte of the block number,
    so a transaction is valid only in the block it was built for
    (bundle-only; a leaked or delayed transaction reverts).
  - 78 handler slots of 64 bytes, selected by the first calldata byte.
- Embedded venue selectors [observed bytes, reachability inferred]:
  UniswapV2 `swap` (0x022c0d9f), UniswapV3 `swap` (0x128acb08, 2×), ERC20
  transfer/transferFrom/balanceOf/approve, WETH deposit/withdraw.
- Opcodes (linear sweep, upper bounds): `COINBASE` 2 (likely builder
  payment), `TLOAD` 5 (post-Cancun build), `CALL` 110, `CODECOPY` 121
  (selectors and calldata templates copied from code-data).
- Opposite-direction check [passed]: the embedded operator
  0xae2fc483527b8ef99eb5d9b44875f005ba1fae13 has no code (EOA), first seen
  2023-03-01, 6,603,283 outbound transactions (`stalkchain_wallet_age`),
  about 4,900 a day, which is consistent with an automated operator.
- Unknowns: per-handler semantics, profit split, which pools it targets now.

## Hyperliquid directional whale — 0x5b5d51203a0f9079f8aeb098a6523a13f298c060

- Leaderboard (month, by PnL): rank 1, PnL +$106.7M, ROI 57.3%, volume
  $228M on $234.7M account value, so turnover is about 1x (directional, not
  a market maker).
- Wallet read: account $144.8M, open notional $683.8M (about 4.7x effective
  leverage), 25 positions, all large ones short (ETH, BTC, SOL, ZEC, HYPE,
  GOLD, XRP, SILVER, …), cross margin at 2–7x.
- Execution [observed]: equal-size slices at one price within seconds
  (three SUI closes of about 21,873 each; six WLD opens in the same
  millisecond); fees of about $4 on $20K notional, consistent with passive
  or low-fee execution.
- Edge [inferred]: a macro short book across majors and alts that scales out
  of winners in slices; 24.1% win rate over 580 recent closes with positive
  realized PnL, so many small losing trims and a few large winners.
- Risk [observed]: day PnL −$14.4M at read time; funding paid since open of
  millions of dollars on the ETH, SOL, BTC, and HYPE shorts; liquidation
  prices far above mark.
- Opposite-direction check [passed]: the leaderboard and wallet agree on
  scale. On Ethereum the address has no code (EOA).

## Hyperliquid leaderboard mismatch — 0x87f9cd15f5050a9283b8896300f7c8cf69ece2cf

- Leaderboard (month): rank 3, account $120.0M, PnL +$26.7M, volume
  $19.37B, turnover about 161x, which looks like a market maker.
- Wallet read: account $12,618, last fills 2025-06-13, all-time PnL −$26.69.
- Verdict: unresolved. The leaderboard identity does not hold the capital
  the row describes (likely a vault, subaccount, or agent wallet). Do not
  profile it as a market maker until the trading account is found.

## Social spot trader — bystevenr (userId 37d7f7be-…)

- Leaderboard (30d): PnL +$581.6K on $8.07M volume, 2,710 trades (about 90
  a day). Both wallets have `onchain-holdings` evidence.
- Report: portfolio $329.9K, top-5 concentration 99% (ORE $195.5K, USDC
  $72.3K, MINECAT $38.1K); closed sample of 25: 19 wins and 6 losses (76%),
  realized +$665 in the sample.
- Edge [inferred]: a high-frequency memecoin rotation with many small wins,
  while most of the 30-day PnL sits in a few concentrated holdings.
- Limits: search-mode report (null profile PnL, spotlight timed out); the
  25-position sample cannot explain the 30-day PnL.
