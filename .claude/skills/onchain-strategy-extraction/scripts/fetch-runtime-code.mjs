#!/usr/bin/env node
// Fetch deployed runtime bytecode with eth_getCode and write it as a hex
// carrier that `rea inspect-evm-interface <path> hex` accepts.
//
// Usage: fetch-runtime-code.mjs <0xaddress> <out.hex> [rpcUrl] [block]
import { writeFileSync } from "node:fs";

const [
  address,
  outPath,
  rpcUrl = "https://ethereum-rpc.publicnode.com",
  block = "latest",
] = process.argv.slice(2);
if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? "") || !outPath) {
  console.error(
    "usage: fetch-runtime-code.mjs <0xaddress> <out.hex> [rpcUrl] [block]",
  );
  process.exit(2);
}

const response = await fetch(rpcUrl, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getCode",
    params: [address, block],
  }),
  signal: AbortSignal.timeout(20_000),
});
const reply = await response.json();
if (typeof reply.result !== "string") {
  console.error(
    JSON.stringify({ address, rpcUrl, error: reply.error ?? reply }),
  );
  process.exit(1);
}

writeFileSync(outPath, reply.result);
const bytes = (reply.result.length - 2) / 2;
// An empty result means an EOA (or a self-destructed contract) at this block.
console.log(
  JSON.stringify({
    address,
    block,
    rpcUrl,
    outPath,
    bytes,
    kind: bytes ? "contract" : "eoa-or-empty",
  }),
);
