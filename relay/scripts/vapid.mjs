const { subtle } = globalThis.crypto;
const b64url = (bytes) => Buffer.from(bytes).toString("base64url");
const pair = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const jwk = await subtle.exportKey("jwk", pair.privateKey);
const raw = new Uint8Array(await subtle.exportKey("raw", pair.publicKey));
const keys = { publicKey: b64url(raw), privateKey: jwk.d };
const vars = { VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey };
process.stdout.write(process.argv[2] === "json" ? JSON.stringify(vars) : Object.entries(vars).map(([k, v]) => `${k}=${v}\n`).join(""));
