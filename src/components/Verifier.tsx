"use client";

import { useState } from "react";

/** Recalcula el sorteo en el navegador con Web Crypto (mismo algoritmo que el servidor) */
async function hmacHex(key: string, msg: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function Verifier(props: { seed: string; seedHash: string; randomness: string; total: number; counters: number[]; numbers: number[] }) {
  const [seed, setSeed] = useState(props.seed);
  const [rnd, setRnd] = useState(props.randomness);
  const [total, setTotal] = useState(String(props.total));
  const [out, setOut] = useState<{ hashOk: boolean; rows: { counter: number; n: number; ok: boolean }[] } | null>(null);
  async function run() {
    const hashOk = (await sha256Hex(seed)) === props.seedHash;
    const rows = [];
    for (const [i, c] of props.counters.entries()) {
      const h = await hmacHex(seed, `${rnd}:${c}`);
      const n = Number(BigInt("0x" + h) % BigInt(Number(total))) + 1;
      rows.push({ counter: c, n, ok: n === props.numbers[i] });
    }
    setOut({ hashOk, rows });
  }
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Clave secreta (revelada)</label>
        <input className="input font-mono text-xs" value={seed} onChange={(e) => setSeed(e.target.value)} />
      </div>
      <div>
        <label className="label">Aleatoriedad pública (drand)</label>
        <input className="input font-mono text-xs" value={rnd} onChange={(e) => setRnd(e.target.value)} />
      </div>
      <div>
        <label className="label">Total de papeletas</label>
        <input className="input w-40" value={total} onChange={(e) => setTotal(e.target.value)} />
      </div>
      <button onClick={run} className="btn-primary" data-testid="verify-run">🔍 Recalcular en mi navegador</button>
      {out && (
        <div className="rounded-xl bg-violet-50 p-3 text-sm" data-testid="verify-result">
          <p>{out.hashOk ? "✅ La clave coincide con la huella publicada al crear el sorteo." : "❌ La clave NO coincide con la huella."}</p>
          {out.rows.map((r, i) => (
            <p key={i}>
              {r.ok ? "✅" : "❌"} {i === 0 ? "Ganador" : `Suplente ${i}`} (contador {r.counter}): papeleta <b>#{r.n}</b>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
