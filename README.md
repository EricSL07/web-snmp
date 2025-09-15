Perfeito 🚀 — segue tudo já formatado em **README.md** com título, seções e exemplos prontos.
Você só precisa ajustar os caminhos (`<SEU_REPO_URL>`, `<RAIZ_DO_APP_NEXT>`) para refletir a estrutura real do seu projeto.

---
# Projeto Integrador — Next.js + Zabbix + Ansible

Integração entre **Next.js** e **Zabbix** via API JSON-RPC, com suporte adicional a **Ansible API** e ambiente de teste com **mock-switch**.  

---

## 📦 Requisitos

- **Git**
- **Docker** e **Docker Compose** (v2+)
- **Node.js** 18+ (recomendado 20+) e **npm** (ou pnpm/yarn)
- **cURL** para testes

---

## 🚀 1) Clonar o projeto

```bash
git clone <SEU_REPO_URL>.git
cd <SEU_REPO_DIR>
````

---

## ⚙️ 2) Variáveis de ambiente (Next.js)

Crie o arquivo `.env.local` na raiz do app Next.js (ex.: `apps/web/.env.local`) com:

```env
ZABBIX_URL=http://localhost:8080/api_jsonrpc.php
ZABBIX_USER=Admin
ZABBIX_PASSWORD=zabbix
```

---

## 🐳 3) Subir a infraestrutura com Docker

Se o `docker-compose.yml` estiver em `infra/`:

```bash
cd infra
docker compose up -d
```

Isso deve subir:

* `app-postgres` (banco do app)
* `zabbix-postgres`
* `zabbix-server`
* `zabbix-web` (porta **8080** → API/GUI)
* `ansible-api` (opcional)
* `mock-switch` (opcional)

### Verificar status e logs

```bash
docker compose ps
docker logs -f zabbix-server
```

Teste a API do Zabbix diretamente:

```bash
curl -X POST http://localhost:8080/api_jsonrpc.php \
  -H "Content-Type: application/json-rpc" \
  -d '{"jsonrpc":"2.0","method":"apiinfo.version","params":{},"id":1}'
```

**Esperado:**

```json
{"jsonrpc":"2.0","result":"7.4.2","id":1}
```

---

## 📥 4) Instalar dependências do Next.js

No diretório do app Next.js:

```bash
cd <RAIZ_DO_APP_NEXT>
npm install
```

---

## ▶️ 5) Rodar o Next.js

### Desenvolvimento

```bash
npm run dev
```

### Produção

```bash
npm run build
npm run start
```

O app estará disponível em `http://localhost:3000`.

---

## ✅ 6) Testes de verificação (cURL)

### 6.1 Health check do Zabbix

```bash
curl http://localhost:3000/api/zbx/health
```

**Esperado:**

```json
{ "ok": true, "version": "7.4.2" }
```

---

### 6.2 Login no Zabbix

```bash
curl http://localhost:3000/api/zbx/login
```

**Esperado:**

```json
{ "ok": true, "token": "xxxxxxxxxxxxxxxx" }
```

---

### 6.3 Listar hosts

```bash
curl http://localhost:3000/api/zbx/hosts
```

**Esperado:**

```json
{
  "ok": true,
  "hosts": [
    {
      "hostid": "10084",
      "host": "Zabbix server",
      "name": "Zabbix server",
      "status": "0",
      "interfaces": [{ "ip": "127.0.0.1" }]
    }
  ]
}
```

---

## 🔧 7) Testar Ansible API + mock-switch

Se o compose inclui `ansible-api` e `mock-switch`:

```bash
curl -X POST http://localhost:3000/api/ansible \
  -H "Content-Type: application/json" \
  -d '{"playbook":"ping.yml","limit":"mock-switch"}'
```

**Esperado:**

```json
{ "stdout": "PONG", "stderr": "", "rc": 0 }
```

---

## 📚 Referências

* [Zabbix JSON-RPC API](https://www.zabbix.com/documentation/current/en/manual/api)
* [user.login](https://www.zabbix.com/documentation/current/en/manual/api/reference/user/login)
* [host.get](https://www.zabbix.com/documentation/current/en/manual/api/reference/host/get)
* [Ansible Documentation](https://docs.ansible.com/)
