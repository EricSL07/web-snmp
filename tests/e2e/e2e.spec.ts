import { test, expect } from '@playwright/test';

// End-to-end flow: register -> login -> dashboard -> create switch -> view switch -> commands -> credentials

const TEST_USER = { login: `e2e_user_${Date.now()}`, password: 'e2ePass123' };
const uniqueSuffix = Date.now();
const NEW_SWITCH = { hostname: `sw-${uniqueSuffix}`, ipAddress: `10.10.${Math.floor(uniqueSuffix % 250)}.${Math.floor((uniqueSuffix / 250) % 250)}`, group: 'lab' };

// Helper: create credential via API
async function createCredential(requestCtx: any, base: string) {
  // Delete existing credential with same name to ensure idempotency from previous runs
  await requestCtx.delete(`${base}/api/credentials?name=e2e-cred`).catch(() => null);
  const res = await requestCtx.post(`${base}/api/credentials`, {
    data: { name: 'e2e-cred', username: 'admin', secret: 'admin123', type: 'password' }
  });
  const body = await res.json();
  return body?.id;
}

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test('full user journey', async ({ page, request }) => {
  // 1) Register
  await page.goto(`${BASE}/registrar`);
  await page.fill('input[placeholder="LOGIN"]', TEST_USER.login);
  await page.fill('input[placeholder="SENHA"]', TEST_USER.password);
  await page.fill('input[placeholder="CONFIRMAR SENHA"]', TEST_USER.password);
  await page.click('button:has-text("REGISTRAR")');
  // After success it should redirect to /login
  await page.waitForURL('**/login');

  // 2) Login
  await page.fill('input[placeholder="LOGIN"]', TEST_USER.login);
  await page.fill('input[placeholder="SENHA"]', TEST_USER.password);
  await page.click('button:has-text("ENTRAR")');
  await page.waitForURL('**/dashboard');

  // 3) Dashboard visible and can open registrar switch
  await expect(page.locator('text=NOVO SWITCH')).toBeVisible();
  await page.click('text=NOVO SWITCH');
  await page.waitForURL('**/dashboard/switch/registrar');

  // 4) Register a new switch
  // Ensure previous test switch is removed by hostname and ipAddress
  await request.delete(`${BASE}/api/switches?hostname=${encodeURIComponent(NEW_SWITCH.hostname)}`).catch(() => null);
  await request.delete(`${BASE}/api/switches?ipAddress=${encodeURIComponent(NEW_SWITCH.ipAddress)}`).catch(() => null);
  await page.fill('input[placeholder="NOME DO HOST"]', NEW_SWITCH.hostname);
  await page.fill('input[placeholder="ENDEREÇO IP"]', NEW_SWITCH.ipAddress);
  await page.fill('input[placeholder="GRUPO DO HOST"]', NEW_SWITCH.group);
  await page.click('button:has-text("REGISTRAR")');
  await page.waitForURL('**/dashboard');

  // 5) Ensure the new switch is listed and navigate to it
  // Debug: fetch switches via API to ensure the switch was created
  const switchesRes = await request.get(`${BASE}/api/switches`);
  const switchesBody = await switchesRes.json().catch(() => null);
  console.log('switches from API after create:', switchesBody);

  await expect(page.locator(`text=${NEW_SWITCH.hostname.toUpperCase()}`)).toBeVisible({ timeout: 5000 });
  await page.click(`text=${NEW_SWITCH.hostname.toUpperCase()}`);
  await page.waitForURL('**/dashboard/switch/**');

  // 6) On switch page, ensure hostname is displayed
  await expect(page.locator(`h1:text-matches("${NEW_SWITCH.hostname}", "i")`)).toBeVisible();

  // 7) Go to commands page for switch
  await page.click('text=COMANDOS');
  await page.waitForURL('**/comandos');

  // 8) Create a credential via API and select it
  const credId = await createCredential(request, BASE);
  // Wait for credentials list to refresh in UI
  // Wait for credentials list to refresh in UI. Reload to ensure the client fetches new credentials
  await page.reload();
  await page.waitForSelector(`button:has-text("e2e-cred")`, { timeout: 30000 });
  await page.click(`button:has-text("e2e-cred")`);

  // 9) Run a preset playbook (version) and expect result to appear
  await page.click('button:has-text("Preset: VERSÃO")');
  await page.click('button:has-text("Executar")');
  // Wait for result area to appear (STDOUT / STDERR / Código de retorno), give more time for Ansible
  await page.waitForFunction(() => {
    const t = document.body.innerText || '';
    return t.includes('STDOUT') || t.includes('STDERR') || t.includes('Código de retorno') || t.includes('Código de retorno:') || t.includes('Código de retorno');
  }, { timeout: 30000 });

  // 10) Verify Zabbix API endpoints used by UI return data (via request) – ensure /api/zbx/host responds
  const zbxHostRes = await request.get(`${BASE}/api/zbx/host?host=all`);
  expect(zbxHostRes.ok()).toBeTruthy();
  const zbxHostBody = await zbxHostRes.json();
  // We only assert the shape
  expect(zbxHostBody).toBeDefined();
});
