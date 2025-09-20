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

