#!/bin/bash

# Script para testar APIs usando curl - web-snmp
# Execute: chmod +x test-curl.sh && ./test-curl.sh

echo "🚀 Testando APIs do web-snmp com curl..."
echo "========================================"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para testar URL
test_url() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    echo -e "\n${BLUE}🔍 Testando $name...${NC}"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/response.txt "$url" 2>/dev/null)
    http_code="${response: -3}"
    
    if [ "$http_code" -eq "$expected_status" ] || [ "$http_code" -eq 200 ] || [ "$http_code" -eq 302 ]; then
        echo -e "${GREEN}✅ $name: OK (HTTP $http_code)${NC}"
        return 0
    else
        echo -e "${RED}❌ $name: FALHOU (HTTP $http_code)${NC}"
        return 1
    fi
}

# Função para testar porta SSH
test_ssh_port() {
    echo -e "\n${BLUE}🔍 Testando Mock Switch SSH...${NC}"
    
    if timeout 5 bash -c 'cat < /dev/null > /dev/tcp/localhost/2222'; then
        echo -e "${GREEN}✅ Mock Switch SSH: Porta 2222 aberta${NC}"
        return 0
    else
        echo -e "${RED}❌ Mock Switch SSH: Porta 2222 fechada${NC}"
        return 1
    fi
}

# Teste 1: Aplicação Next.js
test_url "Aplicação Next.js" "http://localhost:3000"

# Teste 2: Prisma Studio
test_url "Prisma Studio" "http://localhost:5555"

# Teste 3: Zabbix Web Interface
test_url "Zabbix Web" "http://localhost:8080"

# Teste 4: Ansible API Health
echo -e "\n${BLUE}🔍 Testando Ansible API Health...${NC}"
ansible_response=$(curl -s -w "%{http_code}" http://localhost:5000/health 2>/dev/null)
ansible_code="${ansible_response: -3}"

if [ "$ansible_code" -eq 200 ]; then
    echo -e "${GREEN}✅ Ansible API: OK${NC}"
else
    echo -e "${RED}❌ Ansible API: FALHOU (HTTP $ansible_code)${NC}"
fi

# Teste 5: PostgreSQL (teste básico de porta)
echo -e "\n${BLUE}🔍 Testando PostgreSQL...${NC}"
if timeout 3 bash -c 'cat < /dev/null > /dev/tcp/localhost/5432'; then
    echo -e "${GREEN}✅ PostgreSQL: Porta 5432 aberta${NC}"
else
    echo -e "${RED}❌ PostgreSQL: Porta 5432 fechada${NC}"
fi

# Teste 6: Mock Switch SSH
test_ssh_port

# Teste 7: Zabbix API (JSON-RPC)
echo -e "\n${BLUE}🔍 Testando Zabbix API...${NC}"
zabbix_api_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "apiinfo.version",
    "params": {},
    "id": 1
  }' \
  http://localhost:8080/api_jsonrpc.php)

if echo "$zabbix_api_response" | grep -q "result"; then
    echo -e "${GREEN}✅ Zabbix API: Respondendo${NC}"
    echo -e "${YELLOW}📄 Versão: $(echo "$zabbix_api_response" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)${NC}"
else
    echo -e "${RED}❌ Zabbix API: Não respondeu corretamente${NC}"
fi

# Teste 8: Teste de login Zabbix
echo -e "\n${BLUE}🔍 Testando Login Zabbix...${NC}"
zabbix_login_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "user.login",
    "params": {
      "username": "Admin",
      "password": "zabbix"
    },
    "id": 1
  }' \
  http://localhost:8080/api_jsonrpc.php)

if echo "$zabbix_login_response" | grep -q "result"; then
    echo -e "${GREEN}✅ Zabbix Login: Sucesso${NC}"
else
    echo -e "${RED}❌ Zabbix Login: Falhou${NC}"
    echo -e "${YELLOW}📄 Resposta: $zabbix_login_response${NC}"
fi

echo -e "\n${BLUE}========================================"
echo -e "🎯 Teste concluído!${NC}"
echo -e "${YELLOW}💡 Para testes mais detalhados, use: cd tests && npm run test${NC}"