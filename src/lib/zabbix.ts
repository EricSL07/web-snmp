// src/lib/zabbix.ts
// Helper to read env in a type-safe way without relying on global Node types
const env = {
  ZABBIX_URL: (globalThis as any).process?.env?.ZABBIX_URL as string,
  ZABBIX_USER: (globalThis as any).process?.env?.ZABBIX_USER as string,
  ZABBIX_PASSWORD: (globalThis as any).process?.env?.ZABBIX_PASSWORD as string,
};
export async function zabbixLogin(): Promise<string> {
  const res = await fetch(env.ZABBIX_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json-rpc" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "user.login",
      params: {
        username: env.ZABBIX_USER!,
        password: env.ZABBIX_PASSWORD!,
      },
      id: 1,
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`[user.login] ${data.error.message}: ${data.error.data}`);
  }

  return data.result as string; // auth token
}

export async function zabbixGetHosts() {
  const token = await zabbixLogin();

  const res = await fetch(env.ZABBIX_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json-rpc",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "host.get",
      params: {
          output: ["hostid", "host", "name", "status"],
          selectInterfaces: ["ip"],
          // fetch a larger set of hosts by default; omit or increase as needed
          limit: 1000,
      },
      id: 2,
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`[host.get] ${data.error.message}: ${data.error.data}`);
  }

  return data.result;
}

// Generic JSON-RPC helper with Bearer token
async function zbxRpc<T = any>(method: string, params: any, token: string, id = 1): Promise<T> {
  const res = await fetch(env.ZABBIX_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json-rpc",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`[${method}] ${data.error.message}: ${data.error.data}`);
  }
  return data.result as T;
}

export type ZabbixHost = {
  hostid: string;
  host: string;
  name: string;
  status: string;
};

export type ZabbixItem = {
  itemid: string;
  name: string;
  key_: string;
  lastvalue?: string;
  lastclock?: string;
  state?: string;
  status?: string;
  value_type: "0" | "1" | "2" | "3" | "4" | number; // zbx returns as string
  units?: string;
};

type HistoryPoint = { clock: string | number; value: string };

// Find a host by name (exact) or by id if already numeric string
export async function zabbixResolveHostId(hostOrId: string): Promise<string> {
  const token = await zabbixLogin();
  if (/^\d+$/.test(hostOrId)) return hostOrId;
  const result = await zbxRpc<ZabbixHost[]>(
    "host.get",
    { filter: { host: [hostOrId] }, output: ["hostid", "host", "name", "status"] },
    token,
    2
  );
  if (!result?.length) throw new Error(`Host not found: ${hostOrId}`);
  return result[0].hostid;
}

// Get items for a host with optional key_ prefix or search term
export async function zabbixGetItems(hostid: string, opts?: { keyPrefix?: string; searchKey?: string }) {
  const token = await zabbixLogin();
  const params: any = {
    hostids: hostid,
    output: ["itemid", "name", "key_", "lastvalue", "lastclock", "status", "state", "value_type", "units"],
    sortfield: "name",
    limit: 200,
  };
  if (opts?.keyPrefix) {
    params.search = { key_: opts.keyPrefix };
    params.searchByAny = true;
  }
  if (opts?.searchKey) {
    params.search = { ...(params.search || {}), key_: opts.searchKey };
    params.searchByAny = true;
  }
  const items = await zbxRpc<ZabbixItem[]>("item.get", params, token, 3);
  return items;
}

// Get history for an item within a time range
export async function zabbixGetHistory(itemid: string, valueType: number, timeFrom: number, timeTill: number) {
  const token = await zabbixLogin();
  const history = await zbxRpc<HistoryPoint[]>(
    "history.get",
    { itemids: itemid, history: valueType, time_from: timeFrom, time_till: timeTill, sortfield: "clock", sortorder: "ASC", output: "extend" },
    token,
    4
  );
  return history;
}

// Ensure a host group exists and return its id
export async function zabbixEnsureHostGroup(name: string): Promise<string> {
  const token = await zabbixLogin();
  // Try to find existing group
  const groups = await zbxRpc<any[]>(
    "hostgroup.get",
    { filter: { name: [name] }, output: ["groupid", "name"] },
    token,
    5
  );
  if (groups?.length) return groups[0].groupid;
  // Create if missing
  const created = await zbxRpc<any>(
    "hostgroup.create",
    { name },
    token,
    6
  );
  const gid = created?.groupids?.[0] || created?.groupid || created?.result?.groupids?.[0];
  if (!gid) throw new Error("Failed to create host group");
  return gid;
}

// Get template id by exact name
export async function zabbixGetTemplateIdByName(name: string): Promise<string> {
  const token = await zabbixLogin();
  const templates = await zbxRpc<any[]>(
    "template.get",
    { filter: { name: [name] }, output: ["templateid", "name"] },
    token,
    7
  );
  if (!templates?.length) throw new Error(`Template not found: ${name}`);
  return templates[0].templateid;
}

export type CreateHostInput = {
  host: string; // technical name (unique)
  name?: string; // visible name
  ip?: string;
  dns?: string; // preferred when provided
  groups?: string[]; // group names
  templateNames?: string[]; // template names
};

// Create a host with given groups and templates (idempotent by host name)
export async function zabbixEnsureHost(input: CreateHostInput): Promise<{ hostid: string }> {
  const token = await zabbixLogin();
  // If exists, return
  const existing = await zbxRpc<any[]>(
    "host.get",
    { filter: { host: [input.host] }, output: ["hostid", "host", "name"] },
    token,
    8
  );
  if (existing?.length) {
    return { hostid: existing[0].hostid };
  }

  // Resolve group ids
  const groupNames = input.groups?.length ? input.groups : ["Simulated Switches"];
  const groupids: string[] = [];
  for (const g of groupNames) {
    groupids.push(await zabbixEnsureHostGroup(g));
  }

  // Resolve template ids (prefer ICMP Ping template which requires no agent)
  const templateNames = input.templateNames?.length
    ? input.templateNames
    : [
        "Template ICMP Ping",
        "Template Module ICMP Ping",
        "ICMP Ping",
        "Template Network ICMP Ping",
      ];
  const templateids: string[] = [];
  let foundOne = false;
  for (const t of templateNames) {
    try {
      const id = await zabbixGetTemplateIdByName(t);
      templateids.push(id);
      foundOne = true;
      break; // one is enough for our test hosts
    } catch (_) {
      // try next candidate
    }
  }
  if (!foundOne) {
    throw new Error(`None of the ICMP templates found. Tried: ${templateNames.join(", ")}`);
  }

  const useDns = !!input.dns;
  const interfaceObj = {
    type: 1, // Zabbix agent (just to satisfy host interface requirement)
    main: 1,
    useip: useDns ? 0 : 1,
    ip: input.ip || (useDns ? "" : input.host),
    dns: input.dns || (useDns ? input.host : ""),
    port: "10050",
  };

  const params: any = {
    host: input.host,
    name: input.name || input.host,
    groups: groupids.map((id) => ({ groupid: id })),
    interfaces: [interfaceObj],
    templates: templateids.map((id) => ({ templateid: id })),
  };

  const created = await zbxRpc<any>("host.create", params, token, 9);
  const hostid = created?.hostids?.[0] || created?.hostid;
  if (!hostid) throw new Error("Failed to create host");
  return { hostid };
}

// Build temperature series: pick first float item whose key or name contains 'temp'
export async function zabbixGetTemperatureSeries(host: string, minutes = 60) {
  const hostid = await zabbixResolveHostId(host);
  // Try multiple targeted searches for Cisco template temperature items
  const buckets: ZabbixItem[][] = [];
  buckets.push(await zabbixGetItems(hostid, { searchKey: "sensor.temp." })); // Cisco IOS template LLD items
  buckets.push(await zabbixGetItems(hostid, { searchKey: "ciscoEnvMonTemperatureStatusValue" }));
  buckets.push(await zabbixGetItems(hostid, { searchKey: "entPhySensorValue" }));
  buckets.push(await zabbixGetItems(hostid, { searchKey: "system.hw.temperature" })); // generic
  // Fallback broad search
  buckets.push(await zabbixGetItems(hostid, { searchKey: "temp" }));
  // Additional fallback: fetch full item list and filter by name/units
  buckets.push(await zabbixGetItems(hostid));
  const items = buckets.flat();
  const tempCandidates = items.filter((it) => {
    const key = (it.key_ || "").toLowerCase();
    const name = (it.name || "").toLowerCase();
    const units = (it.units || "").toLowerCase();
    const vt = Number(it.value_type);
    const byUnits = units.includes("c"); // C or °C
    const byKeyName = /\bsensor\.temp\.|temp|temperat|ciscoenvmontemperaturestatusvalue|entphysensorvalue/.test(key) || /temp|temperat/.test(name);
    const numeric = vt !== 4; // exclude text
    return numeric && (byUnits || byKeyName);
  });
  // Prefer items with units C and float value type
  const tempItem = tempCandidates.sort((a, b) => {
    const aScore = (a.units?.toLowerCase().includes("c") ? 2 : 0) + (Number(a.value_type) === 0 ? 1 : 0);
    const bScore = (b.units?.toLowerCase().includes("c") ? 2 : 0) + (Number(b.value_type) === 0 ? 1 : 0);
    return bScore - aScore;
  })[0];
  if (!tempItem) throw new Error("No temperature item found");
  const now = Math.floor(Date.now() / 1000);
  const from = now - minutes * 60;
  const hist = await zabbixGetHistory(tempItem.itemid, Number(tempItem.value_type) || 0, from, now);
  let labels = hist.map((p) => new Date(Number(p.clock) * 1000).toISOString());
  let values = hist.map((p) => Number(p.value));
  if (hist.length === 0 && tempItem.lastvalue != null && tempItem.lastvalue !== "") {
    const lc = Number(tempItem.lastclock || 0);
    const ts = lc > 0 ? lc : now;
    labels = [new Date(ts * 1000).toISOString()];
    values = [Number(tempItem.lastvalue)];
  }
  return { item: { itemid: tempItem.itemid, name: tempItem.name }, labels, values };
}

// Build traffic series: choose the interface with highest lastvalue for inbound; fetch both in/out
export async function zabbixGetTrafficSeries(host: string, minutes = 60) {
  const hostid = await zabbixResolveHostId(host);
  // Look for standard SNMP interface items with preprocessed rate: net.if.in/out
  const items = await zabbixGetItems(hostid, { keyPrefix: "net.if." });
  const inItems = items.filter((it) => it.key_.startsWith("net.if.in["));
  const outItems = items.filter((it) => it.key_.startsWith("net.if.out["));
  if (!inItems.length || !outItems.length) throw new Error("No interface traffic items found");
  // pick the 'in' item with highest lastvalue
  const pick = inItems
    .map((it) => ({ it, v: Number(it.lastvalue || 0) }))
    .sort((a, b) => b.v - a.v)[0]?.it || inItems[0];
  // find corresponding out by matching SNMPINDEX inside brackets
  const idxMatch = pick.key_.match(/\[(.+)\]/);
  const idx = idxMatch ? idxMatch[1] : undefined;
  const out = idx ? outItems.find((o) => o.key_.includes(`[${idx}]`)) || outItems[0] : outItems[0];
  const now = Math.floor(Date.now() / 1000);
  const from = now - minutes * 60;
  // Traffic items are usually numeric unsigned (3)
  const inHist = await zabbixGetHistory(pick.itemid, Number(pick.value_type) || 3, from, now);
  const outHist = await zabbixGetHistory(out.itemid, Number(out.value_type) || 3, from, now);
  // Compute rates (bits per second) from counter-style history when possible.
  // If history contains counter values (like ifHCInOctets) we compute delta/dt and convert to bits/s.
  const toNum = (v: any) => (v == null || v === "" ? NaN : Number(v));

  function computeRatesFromCounters(hist: { clock: string | number; value: string }[]) {
    if (!hist || hist.length <= 1) return { labels: hist.map((p) => new Date(Number(p.clock) * 1000).toISOString()), rates: hist.map((p) => toNum(p.value)) };
    const labels: string[] = [];
    const rates: number[] = [];
    for (let i = 1; i < hist.length; i++) {
      const prev = toNum(hist[i - 1].value);
      const cur = toNum(hist[i].value);
      const tprev = Number(hist[i - 1].clock);
      const tcur = Number(hist[i].clock);
      const dt = tcur - tprev || 1;
      let diff = cur - prev;
      // handle possible counter wrap (common for 32-bit counters)
      if (diff < 0) {
        // try 32-bit wrap then 64-bit as fallback
        const wrap32 = 2 ** 32;
        const wrap64 = 2 ** 64;
        if (prev >= 0 && prev < wrap32) diff = cur + wrap32 - prev;
        else diff = cur + wrap64 - prev;
      }
      const bytesPerSec = diff / dt;
      const bitsPerSec = bytesPerSec * 8;
      labels.push(new Date(tcur * 1000).toISOString());
      rates.push(bitsPerSec);
    }
    return { labels, rates };
  }

  const inComputed = computeRatesFromCounters(inHist);
  const outComputed = computeRatesFromCounters(outHist);

  // Heuristic: if computed rates are implausibly larger than raw values, assume history already contains rates
  const rawInNums = inHist.map((p) => toNum(p.value)).filter((n) => Number.isFinite(n));
  const meanRaw = rawInNums.length ? rawInNums.reduce((a, b) => a + b, 0) / rawInNums.length : 0;
  const meanComputed = inComputed.rates.length ? inComputed.rates.reduce((a, b) => a + Math.abs(b), 0) / inComputed.rates.length : 0;

  let labels: string[] = [];
  let inValues: number[] = [];
  let outValues: (number | null)[] = [];

  if (meanComputed > 0 && meanComputed / (meanRaw + 1) > 1e4) {
    // Fallback: treat history values as already rates (assume bytes/sec) and convert to bits/sec
    labels = inHist.map((p) => new Date(Number(p.clock) * 1000).toISOString());
    inValues = inHist.map((p) => {
      const v = toNum(p.value);
      return Number.isFinite(v) ? v * 8 : NaN;
    });
    const outMapRaw = new Map(outHist.map((p) => [new Date(Number(p.clock) * 1000).toISOString(), toNum(p.value)]));
    outValues = labels.map((l) => {
      const v = outMapRaw.get(l);
      return v == null || !Number.isFinite(v) ? null : v * 8;
    });
  } else {
    // Normal case: use computed rates (bits/sec) and align out by timestamp
    const outMap = new Map<string, number>();
    for (let i = 0; i < outComputed.labels.length; i++) outMap.set(outComputed.labels[i], outComputed.rates[i]);
    labels = inComputed.labels;
    inValues = inComputed.rates;
    outValues = labels.map((l) => outMap.get(l) ?? null);
  }
  return {
    iface: { inItem: { itemid: pick.itemid, name: pick.name, key: pick.key_ }, outItem: { itemid: out.itemid, name: out.name, key: out.key_ } },
    labels,
    inValues,
    outValues,
  };
}

// Get memory usage series for a host. Tries to find a percent or used/free/total items.
export async function zabbixGetMemorySeries(host: string, minutes = 60) {
  const hostid = await zabbixResolveHostId(host);
  // Try targeted searches for common memory keys
  const buckets: ZabbixItem[][] = [];
  buckets.push(await zabbixGetItems(hostid, { searchKey: "vm.memory.size" }));
  buckets.push(await zabbixGetItems(hostid, { searchKey: "memory" }));
  buckets.push(await zabbixGetItems(hostid, { searchKey: "mem" }));
  buckets.push(await zabbixGetItems(hostid, { searchKey: "ram" }));
  buckets.push(await zabbixGetItems(hostid));
  const items = buckets.flat();

  const numericItems = items.filter((it) => Number(it.value_type) !== 4);
  if (!numericItems.length) throw new Error("No numeric memory items found");

  // Prefer items that look like percent
  const percentItem = numericItems.find((it) => {
    const u = (it.units || "").toLowerCase();
    const k = (it.key_ || "").toLowerCase();
    const n = (it.name || "").toLowerCase();
    return u.includes("%") || /mem.*%|memory.*%|util|usage|used.*%/.test(k + " " + n);
  });
  const now = Math.floor(Date.now() / 1000);
  const from = now - minutes * 60;
  if (percentItem) {
    const hist = await zabbixGetHistory(percentItem.itemid, Number(percentItem.value_type) || 0, from, now);
    const labels = hist.map((p) => new Date(Number(p.clock) * 1000).toISOString());
    const values = hist.map((p) => Number(p.value));
    return { item: { itemid: percentItem.itemid, name: percentItem.name }, labels, values };
  }

  // Try to find total and free items to compute used = total - free
  // Prefer items whose key/name mention memory explicitly
  const memCandidates = numericItems.filter((it) => /(mem|memory|ram|ciscoMemory|vm.memory|physical)/i.test((it.key_ || "") + " " + (it.name || "")));
  if (memCandidates.length) {
    // prefer used/usage/available percent-like names
    const prefer = memCandidates.find((it) => /(used|usage|util|available|free|total|buffers|cache|active)/i.test((it.key_ || "") + " " + (it.name || "")));
    if (prefer) {
      const hist = await zabbixGetHistory(prefer.itemid, Number(prefer.value_type) || 0, from, now);
      const labels = hist.map((p) => new Date(Number(p.clock) * 1000).toISOString());
      const values = hist.map((p) => Number(p.value));
      return { item: { itemid: prefer.itemid, name: prefer.name }, labels, values };
    }
  }

  const totalItem = numericItems.find((it) => /(total|size|memtotal|physical)/i.test(it.key_ + " " + it.name));
  const freeItem = numericItems.find((it) => /(free|available|memfree|memavailable)/i.test(it.key_ + " " + it.name));
  if (totalItem && freeItem) {
    const totalHist = await zabbixGetHistory(totalItem.itemid, Number(totalItem.value_type) || 0, from, now);
    const freeHist = await zabbixGetHistory(freeItem.itemid, Number(freeItem.value_type) || 0, from, now);
    const freeMap = new Map(freeHist.map((p) => [String(p.clock), Number(p.value)]));
    const labels = totalHist.map((p) => new Date(Number(p.clock) * 1000).toISOString());
    const values = totalHist.map((p) => {
      const total = Number(p.value);
      const freeRaw = freeMap.get(String(p.clock));
      const free = typeof freeRaw === 'number' ? freeRaw : Number(freeRaw);
      if (!Number.isFinite(total)) return NaN;
      if (!Number.isFinite(free)) return NaN;
      return total - free; // same unit as items
    });
    return { item: { itemid: totalItem.itemid, name: totalItem.name }, labels, values };
  }

  // If we couldn't find meaningful memory items, fail with a clear error
  throw new Error("No memory items found for host");
}

// Get basic host details (name, host, status, interfaces IP) by host or id
export async function zabbixGetHostDetails(hostOrId: string) {
  const token = await zabbixLogin();
  const id = await zabbixResolveHostId(hostOrId);
  const res = await zbxRpc<any[]>(
    "host.get",
    { hostids: id, output: ["hostid", "host", "name", "status"], selectInterfaces: ["ip", "type"] },
    token,
    10
  );
  return res?.[0] || null;
}

// Get uptime (seconds) last value for a host, if available
export async function zabbixGetHostUptime(hostOrId: string) {
  const token = await zabbixLogin();
  const id = await zabbixResolveHostId(hostOrId);
  const items = await zbxRpc<ZabbixItem[]>(
    "item.get",
    {
      hostids: id,
      output: ["itemid", "name", "key_", "lastvalue", "lastclock", "value_type", "units"],
      search: { key_: "system.uptime" },
      searchByAny: true,
      limit: 5,
    },
    token,
    11
  );
  const item = items?.[0];
  if (!item) return null;
  return { seconds: Number(item.lastvalue || 0), lastclock: Number(item.lastclock || 0), item };
}

function parseIndexFromKey(key: string): string | null {
  const m = key.match(/\[(?:[^\]]*?)\.(\d+)\]/);
  return m ? m[1] : null;
}

function extractIfaceNameFromItemName(name?: string): string | null {
  if (!name) return null;
  const m = name.match(/Interface\s+(.+?)\(\):/);
  if (m) return m[1];
  return null;
}

const ADMIN_STATUS: Record<string, string> = {
  "1": "up",
  "2": "down",
  "3": "testing",
};
const OPER_STATUS: Record<string, string> = {
  "1": "up",
  "2": "down",
  "3": "testing",
  "4": "unknown",
  "5": "dormant",
  "6": "notPresent",
  "7": "lowerLayerDown",
};

export async function zabbixGetPortsSummary(hostOrId: string, limit = 10) {
  const hostid = await zabbixResolveHostId(hostOrId);
  // Fetch a broader set so we can detect VLAN
  const [ifItems, vlanItems] = await Promise.all([
    zabbixGetItems(hostid, { keyPrefix: "net.if." }),
    zabbixGetItems(hostid, { searchKey: "vlan" }),
  ]);
  type Acc = {
    index: string;
    name?: string;
    admin?: string;
    oper?: string;
    speed_mbps?: number;
    in_bps?: number;
    out_bps?: number;
    vlan?: string;
  };
  const byIndex = new Map<string, Acc>();

  for (const it of ifItems) {
    const idx = parseIndexFromKey(it.key_ || "");
    if (!idx) continue;
    let rec = byIndex.get(idx);
    if (!rec) { rec = { index: idx }; byIndex.set(idx, rec); }
    // try to set name from item name
    const nm = extractIfaceNameFromItemName(it.name);
    if (nm && !rec.name) rec.name = nm;

    const key = it.key_;
    if (key.startsWith("net.if.in[")) {
      const v = Number(it.lastvalue || 0);
      rec.in_bps = isFinite(v) ? v : undefined;
    } else if (key.startsWith("net.if.out[")) {
      const v = Number(it.lastvalue || 0);
      rec.out_bps = isFinite(v) ? v : undefined;
    } else if (key.startsWith("net.if.adminstatus[")) {
      const v = String(it.lastvalue ?? "");
      rec.admin = ADMIN_STATUS[v] || v || undefined;
    } else if (key.startsWith("net.if.status[")) {
      const v = String(it.lastvalue ?? "");
      rec.oper = OPER_STATUS[v] || v || undefined;
    } else if (key.startsWith("net.if.speed[")) {
      const units = (it.units || "").toLowerCase();
      const raw = Number(it.lastvalue || 0);
      if (units.includes("bps")) {
        rec.speed_mbps = isFinite(raw) ? raw / 1_000_000 : undefined;
      } else {
        // assume value is in Mbit/s if units unknown
        rec.speed_mbps = isFinite(raw) ? raw : undefined;
      }
    } else if (!rec.name && (key.startsWith("net.if.name[") || key.startsWith("net.if.alias[") || key.startsWith("net.if.descr["))) {
      // sometimes name is provided as item value
      if (it.lastvalue) rec.name = String(it.lastvalue);
    }
  }

  // Try to attach VLAN from vlan-related items (dot1qPvid/vmVlan/ifVlan or generic vlan keys)
  for (const it of vlanItems) {
    const key = it.key_ || "";
    const idx = parseIndexFromKey(key) || (key.match(/\.(\d+)\]?$/)?.[1] ?? null);
    if (!idx) continue;
    const rec = byIndex.get(idx);
    if (!rec) continue;
    if (rec.vlan) continue;
    if (/dot1qPvid|vmVlan|ifVlan|\.vlan\b|vlan\./i.test(key)) {
      if (it.lastvalue) rec.vlan = String(it.lastvalue);
    }
  }

  const list = Array.from(byIndex.values())
    .map((r) => ({
      index: r.index,
      name: r.name || r.index,
      oper: r.oper || 'unknown',
      speed_mbps: r.speed_mbps ?? null,
      in_bps: r.in_bps ?? 0,
      out_bps: r.out_bps ?? 0,
      total_bps: (r.in_bps ?? 0) + (r.out_bps ?? 0),
      vlan: r.vlan ?? null,
    }))
    // Only interfaces that are operationally up
    .filter((p) => p.oper === 'up')
    .sort((a, b) => b.total_bps - a.total_bps)
    .slice(0, limit);

  return list;
}

// Ensure SNMP interface exists for host
async function zabbixEnsureSnmpInterface(hostid: string, addr: { ip?: string; dns?: string; port?: string }) {
  const token = await zabbixLogin();
  const ifaces = await zbxRpc<any[]>("hostinterface.get", { hostids: hostid, output: "extend" }, token, 12);
  const hasSnmp = ifaces.some((i) => Number(i.type) === 2);
  if (hasSnmp) return; // assume configured
  const useDns = !!addr.dns;
  await zbxRpc(
    "hostinterface.create",
    {
      hostid,
      type: 2, // SNMP
      main: 1, // default SNMP interface for this type
      useip: useDns ? 0 : 1,
      ip: addr.ip || (useDns ? "" : "127.0.0.1"),
      dns: addr.dns || (useDns ? "localhost" : ""),
      port: addr.port || "161",
      details: { version: 2, bulk: 1, community: "{$SNMP_COMMUNITY}" },
    },
    token,
    13
  );
}

// Ensure a host macro exists with the desired value
async function zabbixEnsureMacro(hostid: string, macro: string, value: string) {
  const token = await zabbixLogin();
  const existing = await zbxRpc<any[]>(
    "usermacro.get",
    { hostids: hostid, filter: { macro: [macro] } },
    token,
    14
  );
  if (existing?.length) {
    const m = existing[0];
    if (m.value !== value) {
      await zbxRpc("usermacro.update", { hostmacroid: m.hostmacroid, value }, token, 15);
    }
    return;
  }
  await zbxRpc("usermacro.create", { hostid, macro, value }, token, 16);
}

// Add a template by name without removing existing ones
async function zabbixAddTemplate(hostid: string, templateName: string) {
  const token = await zabbixLogin();
  const tid = await zabbixGetTemplateIdByName(templateName);
  await zbxRpc("host.massadd", { hosts: [{ hostid }], templates: [{ templateid: tid }] }, token, 17);
}

export async function zabbixEnableSnmpForHost(hostOrId: string, opts?: { ip?: string; dns?: string; community?: string; templateCandidates?: string[] }) {
  const hostid = await zabbixResolveHostId(hostOrId);
  await zabbixEnsureSnmpInterface(hostid, { ip: opts?.ip, dns: opts?.dns, port: "161" });
  await zabbixEnsureMacro(hostid, "{$SNMP_COMMUNITY}", opts?.community || "public");
  // Try common SNMP templates
  const candidates = opts?.templateCandidates?.length
    ? opts.templateCandidates
    : [
        "Template OS Linux by SNMP",
        "Template Net Network Generic Device by SNMP",
        "Template Module Generic SNMPv2",
        "Template Module Interfaces SNMP",
      ];
  for (const name of candidates) {
    try {
      await zabbixAddTemplate(hostid, name);
      // add first successful and continue to also add Interfaces, etc.
    } catch (_) {
      // ignore if not found
    }
  }
  return { hostid };
}


