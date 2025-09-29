#!/bin/bash

# Script para testar especificamente a integração Ansible + Mock Switch
# Execute: chmod +x test-ansible-mock.sh && ./test-ansible-mock.sh

echo "🔗 Testando integração Ansible + Mock Switch..."
echo "=============================================="

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Teste 1: Verificar se o Mock Switch está rodando
echo -e "\n${BLUE}🔍 Verificando Mock Switch SSH...${NC}"
if timeout 5 bash -c 'cat < /dev/null > /dev/tcp/localhost/2222'; then
    echo -e "${GREEN}✅ Mock Switch: Porta SSH aberta${NC}"
else
    echo -e "${RED}❌ Mock Switch: Porta SSH fechada${NC}"
    exit 1
fi

# Teste 2: Verificar se o Ansible API está rodando
echo -e "\n${BLUE}🔍 Verificando Ansible API...${NC}"
ansible_health=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:5000/health 2>/dev/null)
if [ "$ansible_health" -eq 200 ]; then
    echo -e "${GREEN}✅ Ansible API: Funcionando${NC}"
else
    echo -e "${RED}❌ Ansible API: Não está respondendo${NC}"
    exit 1
fi

# Teste 3: Executar playbook de ping via API
echo -e "\n${BLUE}🔍 Executando playbook de ping...${NC}"
ping_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "playbook": "ping.yml",
    "extra_vars": {}
  }' \
  http://localhost:5000/run)

echo -e "${YELLOW}📄 Resposta do ping:${NC}"
echo "$ping_response" | jq . 2>/dev/null || echo "$ping_response"

# Teste 4: Executar playbook show_version via API
echo -e "\n${BLUE}🔍 Executando playbook show_version...${NC}"
version_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "playbook": "show_version.yml",
    "extra_vars": {}
  }' \
  http://localhost:5000/run)

echo -e "${YELLOW}📄 Resposta do show_version:${NC}"
echo "$version_response" | jq . 2>/dev/null || echo "$version_response"

# Teste 5: Conectar diretamente via SSH para validar
echo -e "\n${BLUE}🔍 Teste direto SSH no Mock Switch...${NC}"
echo -e "${YELLOW}💡 Tentando conexão SSH direta...${NC}"

# Usando sshpass se disponível, senão usando expect
if command -v sshpass >/dev/null 2>&1; then
    ssh_result=$(sshpass -p 'admin123' ssh -o StrictHostKeyChecking=no -p 2222 admin@localhost 'whoami && uname -a' 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSH Direto: Sucesso${NC}"
        echo -e "${YELLOW}📄 Output: $ssh_result${NC}"
    else
        echo -e "${RED}❌ SSH Direto: Falhou${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  sshpass não encontrado, pulando teste SSH direto${NC}"
    echo -e "${YELLOW}💡 Instale com: sudo pacman -S sshpass (Arch) ou sudo apt install sshpass (Ubuntu)${NC}"
fi

echo -e "\n${BLUE}=============================================="
echo -e "🎯 Teste de integração concluído!${NC}"
echo -e "${YELLOW}💡 Se algum teste falhou, verifique os logs dos containers:${NC}"
echo -e "${YELLOW}   docker-compose logs ansible-api${NC}"
echo -e "${YELLOW}   docker-compose logs mock-switch${NC}"