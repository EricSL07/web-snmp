# 🧪 Testes das APIs - Web-SNMP

Este diretório contém scripts para testar todas as APIs e serviços do projeto web-snmp.

## 📋 Serviços Testados

- **🚀 Aplicação Next.js** - Interface principal
- **📊 Prisma Studio** - Gerenciamento do banco de dados
- **🔍 Zabbix Web + API** - Monitoramento de rede
- **🔧 Ansible API** - Automação de tarefas
- **🖥️  Mock Switch** - Switch simulado para testes
- **🐘 PostgreSQL** - Banco de dados
- **🔗 Integração Ansible + Mock Switch** - Teste completo da cadeia

## 🚀 Como Executar os Testes

### 1. Teste Rápido (curl)
```bash
# A partir da raiz do projeto
npm run test:quick

# Ou diretamente
cd tests
./test-curl.sh
```

### 2. Teste Completo (Node.js)
```bash
# A partir da raiz do projeto
npm run test:apis

# Ou diretamente
cd tests
node test-apis.js
```

### 3. Teste Específico de Integração
```bash
# A partir da raiz do projeto
npm run test:integration

# Ou diretamente
cd tests
./test-ansible-mock.sh
```

## 📊 Exemplo de Saída

```
🚀 Iniciando testes das APIs do web-snmp...
==========================================

🔌 Testando portas dos serviços...
✅ Next.js App (3001): Porta aberta
✅ Ansible API (5000): Porta aberta
✅ Prisma Studio (5555): Porta aberta
✅ Zabbix Web (8080): Porta aberta
✅ PostgreSQL (5432): Porta aberta
✅ Mock Switch SSH (2222): Porta aberta
✅ Zabbix Server (10051): Porta aberta

🔍 Testando Zabbix API...
✅ Zabbix Login: SUCESSO
✅ Zabbix Hosts: 2 hosts encontrados

🔧 Testando Ansible API...
✅ Ansible API Health: SUCESSO
✅ Ansible Ping Playbook: SUCESSO

🖥️  Testando Mock Switch SSH...
✅ Mock Switch SSH: Conexão estabelecida
✅ Mock Switch Command: Executado com sucesso

🔗 Testando integração Ansible + Mock Switch...
✅ Ansible → Mock Switch: SUCESSO

📊 RESUMO DOS TESTES:
==========================================
PORTS: ✅ PASSOU
ZABBIX: ✅ PASSOU
ANSIBLE: ✅ PASSOU
MOCKSWITCH: ✅ PASSOU
INTEGRATION: ✅ PASSOU

🎯 RESULTADO FINAL: 5/5 testes passaram
🎉 Todas as APIs estão funcionando perfeitamente!
```

## 🔧 Endpoints Testados

### Zabbix API
- `POST /api_jsonrpc.php` - Login e consultas
- Testa autenticação e busca de hosts

### Ansible API
- `GET /health` - Status da API
- `POST /run` - Execução de playbooks

### Mock Switch
- **SSH**: `localhost:2222` (admin/admin123)
- Testa conexão SSH e execução de comandos

### Aplicação Web
- **Next.js**: `http://localhost:3001`
- **Prisma Studio**: `http://localhost:5555`

## 🐛 Troubleshooting

### Se algum teste falhar:

1. **Verificar containers Docker:**
   ```bash
   cd ../infra
   docker-compose ps
   docker-compose logs [serviço]
   ```

2. **Verificar aplicações Node.js:**
   ```bash
   # Verificar se estão rodando
   ps aux | grep node
   
   # Reiniciar se necessário
   cd ..
   npm run dev          # Next.js
   npx prisma studio    # Prisma Studio
   ```

3. **Verificar conectividade SSH:**
   ```bash
   # Testar conexão SSH manual
   ssh -p 2222 admin@localhost
   # Senha: admin123
   ```

4. **Verificar logs específicos:**
   ```bash
   # Logs do Ansible API
   docker-compose logs ansible-api
   
   # Logs do Mock Switch
   docker-compose logs mock-switch
   
   # Logs do Zabbix
   docker-compose logs zabbix-web
   docker-compose logs zabbix-server
   ```

## 📝 Arquivos de Teste

- `test-apis.js` - Teste completo em Node.js
- `test-curl.sh` - Teste rápido com curl
- `test-ansible-mock.sh` - Teste específico de integração
- `package.json` - Dependências e scripts

## 🎯 O que cada teste verifica

1. **Portas**: Se todos os serviços estão escutando nas portas corretas
2. **Zabbix**: Login, API responses, e busca de hosts
3. **Ansible**: Health check e execução de playbooks
4. **Mock Switch**: Conectividade SSH e execução de comandos
5. **Integração**: Ansible executando comandos no Mock Switch via SSH

## 💡 Dicas

- Execute os testes sempre após iniciar os containers
- Use `./test-curl.sh` para verificação rápida
- Use `npm run test` para análise detalhada
- Verifique os logs se algum teste falhar
- O Mock Switch simula um switch real via SSH