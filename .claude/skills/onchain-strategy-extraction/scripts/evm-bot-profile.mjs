#!/usr/bin/env node
// Offline profile of EVM bot runtime bytecode for the cases REA's
// inspect_evm_interface cannot see: non-ABI dispatch, embedded caller/block
// guards, venue selectors stored as code-data, and strategy opcodes.
//
// Usage: evm-bot-profile.mjs <runtime.hex> [jumpSlotBytes=64]
import { readFileSync } from "node:fs";

const [path, slotArg = "64"] = process.argv.slice(2);
if (!path) {
  console.error("usage: evm-bot-profile.mjs <runtime.hex> [jumpSlotBytes]");
  process.exit(2);
}
const code = Buffer.from(
  readFileSync(path, "utf8").trim().replace(/^0x/, ""),
  "hex",
);
const slotBytes = Number(slotArg);

const NAMES = {
  0x00: "STOP",
  0x14: "EQ",
  0x16: "AND",
  0x1a: "BYTE",
  0x1b: "SHL",
  0x1c: "SHR",
  0x32: "ORIGIN",
  0x33: "CALLER",
  0x34: "CALLVALUE",
  0x35: "CALLDATALOAD",
  0x39: "CODECOPY",
  0x3a: "GASPRICE",
  0x41: "COINBASE",
  0x42: "TIMESTAMP",
  0x43: "NUMBER",
  0x47: "SELFBALANCE",
  0x48: "BASEFEE",
  0x56: "JUMP",
  0x57: "JUMPI",
  0x5a: "GAS",
  0x5b: "JUMPDEST",
  0x5c: "TLOAD",
  0x5d: "TSTORE",
  0x5f: "PUSH0",
  0x63: "PUSH4",
  0xf1: "CALL",
  0xf3: "RETURN",
  0xf4: "DELEGATECALL",
  0xfa: "STATICCALL",
  0xfd: "REVERT",
  0xff: "SELFDESTRUCT",
};
const STRATEGY_OPS = [
  "COINBASE",
  "NUMBER",
  "TIMESTAMP",
  "BASEFEE",
  "GASPRICE",
  "ORIGIN",
  "CALL",
  "STATICCALL",
  "DELEGATECALL",
  "CODECOPY",
  "TLOAD",
  "TSTORE",
  "SELFBALANCE",
];
const KNOWN_SELECTORS = {
  "022c0d9f": "UniswapV2 pair swap(uint256,uint256,address,bytes)",
  "0902f1ac": "UniswapV2 pair getReserves()",
  "10d1e85c": "uniswapV2Call(address,uint256,uint256,bytes)",
  "128acb08": "UniswapV3 pool swap(address,bool,int256,uint160,bytes)",
  fa461e33: "uniswapV3SwapCallback(int256,int256,bytes)",
  "23a69e75": "pancakeV3SwapCallback(int256,int256,bytes)",
  "3850c7bd": "UniswapV3 pool slot0()",
  "48c89491": "UniswapV4 PoolManager unlock(bytes)",
  "91dd7346": "unlockCallback(bytes)",
  "3593564c": "UniversalRouter execute(bytes,bytes[],uint256)",
  d06ca61f: "router getAmountsOut(uint256,address[])",
  "5c38449e": "Balancer Vault flashLoan(...)",
  f04f2707: "receiveFlashLoan(...)",
  "42b0b77c": "Aave flashLoanSimple(...)",
  "1b11d0ff": "Aave executeOperation(...)",
  a9059cbb: "ERC20 transfer(address,uint256)",
  "23b872dd": "ERC20 transferFrom(address,address,uint256)",
  "70a08231": "ERC20 balanceOf(address)",
  "095ea7b3": "ERC20 approve(address,uint256)",
  d0e30db0: "WETH deposit()",
  "2e1a7d4d": "WETH withdraw(uint256)",
};

const pushWidth = (op) => (op >= 0x60 && op <= 0x7f ? op - 0x5f : 0);
const instructions = [];
for (let pc = 0; pc < code.length;) {
  const op = code[pc];
  const width = pushWidth(op);
  const immediate = width
    ? code.subarray(pc + 1, pc + 1 + width).toString("hex")
    : null;
  instructions.push({ pc, op, immediate });
  pc += 1 + width;
}
const label = ({ op, immediate }) =>
  (NAMES[op] ??
    (pushWidth(op) ? `PUSH${pushWidth(op)}` : `0x${op.toString(16)}`)) +
  (immediate ? ` 0x${immediate}` : "");

// Entry block: the guard before the first JUMPDEST plus the dispatch block
// that follows it, through its first JUMP.
const firstDest = instructions.findIndex((i) => i.op === 0x5b);
const dispatchJump =
  firstDest === -1
    ? -1
    : instructions.findIndex((i, index) => index > firstDest && i.op === 0x56);
const header = instructions.slice(
  0,
  dispatchJump === -1 ? 24 : Math.min(dispatchJump + 1, firstDest + 16),
);
const embeddedAddresses = header
  .filter((i) => i.op === 0x73)
  .map((i) => `0x${i.immediate}`);
const headerOps = header.map((i) => NAMES[i.op]);
const guards = {
  callerAllowlist: embeddedAddresses.length > 0 && headerOps.includes("CALLER"),
  originAllowlist: embeddedAddresses.length > 0 && headerOps.includes("ORIGIN"),
  blockBoundCallValue:
    headerOps.includes("CALLVALUE") && headerOps.includes("NUMBER"),
};

// Byte-indexed jump table: first calldata byte shifted into a slot address.
const byteDispatch =
  headerOps.includes("CALLDATALOAD") &&
  headerOps.includes("BYTE") &&
  headerOps.includes("SHL");
const destinations = new Set(
  instructions.filter((i) => i.op === 0x5b).map((i) => i.pc),
);
const handlerSlots = [];
for (let k = 1; k < 256 && k * slotBytes < code.length; k++) {
  if (destinations.has(k * slotBytes)) handlerSlots.push(k);
}

// Venue selectors are often stored as code-data and CODECOPY'd, so scan raw
// bytes rather than PUSH4 immediates.
const selectorHits = [];
for (const [selector, name] of Object.entries(KNOWN_SELECTORS)) {
  const needle = Buffer.from(selector, "hex");
  let count = 0;
  for (
    let i = code.indexOf(needle);
    i !== -1;
    i = code.indexOf(needle, i + 1)
  ) {
    count++;
  }
  if (count)
    selectorHits.push({
      selector: `0x${selector}`,
      name,
      rawOccurrences: count,
    });
}

const opcodeCounts = Object.fromEntries(STRATEGY_OPS.map((n) => [n, 0]));
for (const { op } of instructions) {
  if (NAMES[op] in opcodeCounts) opcodeCounts[NAMES[op]]++;
}

console.log(
  JSON.stringify(
    {
      bytes: code.length,
      header: header.map(label),
      embeddedAddresses,
      guards,
      dispatch: byteDispatch
        ? {
            kind: "first-calldata-byte jump table",
            slotBytes,
            handlerSlots: handlerSlots.length,
          }
        : {
            kind: "not byte-indexed (use REA inspect_evm_interface selectors)",
          },
      selectorHits,
      opcodeCounts,
      limits: [
        "Linear sweep: code-data regions are decoded as instructions, so opcode counts are approximate upper bounds.",
        "Raw selector hits show embedded bytes, not proven reachable calls.",
        "Guards are pattern inferences from the entry block, not symbolic execution.",
      ],
    },
    null,
    1,
  ),
);
