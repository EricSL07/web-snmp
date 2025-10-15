// src/lib/zabbix.ts
export async function zabbixLogin(): Promise<string> {
  const res = await fetch(process.env.ZABBIX_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json-rpc" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "user.login",
      params: {
        username: process.env.ZABBIX_USER!,
        password: process.env.ZABBIX_PASSWORD!,
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

  const res = await fetch(process.env.ZABBIX_URL!, {
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
        limit: 5,
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
  const res = await fetch(process.env.ZABBIX_URL!, {
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
  const labels = hist.map((p) => new Date(Number(p.clock) * 1000).toISOString());
  const values = hist.map((p) => Number(p.value));
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
  // Normalize labels by using 'in' timestamps
  const labels = inHist.map((p) => new Date(Number(p.clock) * 1000).toISOString());
  const inValues = inHist.map((p) => Number(p.value));
  // Map out values by timestamp (clock)
  const outMap = new Map(outHist.map((p) => [String(p.clock), Number(p.value)]));
  const outValues = inHist.map((p) => outMap.get(String(p.clock)) ?? null);
  return {
    iface: { inItem: { itemid: pick.itemid, name: pick.name, key: pick.key_ }, outItem: { itemid: out.itemid, name: out.name, key: out.key_ } },
    labels,
    inValues,
    outValues,
  };
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


