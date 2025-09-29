# 🌐 Web-SNMP

Sistema web integrado para monitoramento e gerenciamento de switches de rede usando SNMP, Zabbix, Ansible e interface Next.js.

## 📋 Sobre o Projeto

O Web-SNMP é uma solução completa que combina monitoramento de rede, automação e gerenciamento através de uma interface web moderna. O projeto integra múltiplas tecnologias para fornecer uma plataforma robusta de gerenciamento de infraestrutura de rede.

### 🏗️ Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   APIs & Monit.  │    │  Infraestrutura │
│                 │    │                  │    │                 │
│ • Next.js       │◄──►│ • Zabbix API     │◄──►│ • PostgreSQL    │
│ • Prisma Studio │    │ • Ansible API    │    │ • Mock Switch   │
│ • Dashboard     │    │ • REST Endpoints │    │ • Docker        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Funcionalidades

### 📊 **Monitoramento**
- Interface web para Zabbix
- Dashboard com métricas em tempo real
- Alertas e notificações
- Histórico de performance

### 🔧 **Automação**
- Execução de playbooks Ansible via API
- Configuração automática de switches
- Scripts de manutenção
- Comandos remotos via SSH

### 👥 **Gerenciamento**
- Sistema de autenticação JWT
- Cadastro de usuários e switches
- Interface administrativa
- Logs de atividades

### 🧪 **Testes**
- Testes automatizados de APIs
- Validação de conectividade
- Testes de integração
- Monitoramento de saúde dos serviços

## 🛠️ Tecnologias

### Frontend
- **Next.js 15.5.2** - Framework React com Turbopack
- **React 19.1.0** - Interface de usuário
- **Chart.js** - Gráficos e visualizações
- **TailwindCSS** - Estilização
- **TypeScript** - Tipagem estática

### Backend & APIs
- **Prisma** - ORM e gerenciamento de banco
- **PostgreSQL** - Banco de dados principal
- **Zabbix** - Monitoramento de rede
- **Ansible** - Automação e configuração
- **Flask** - API do Ansible

### Infraestrutura
- **Docker & Docker Compose** - Containerização
- **OpenSSH Server** - Mock Switch para testes
- **JWT** - Autenticação
- **bcryptjs** - Hash de senhas

### Testes
- **Axios** - Cliente HTTP para testes
- **SSH2** - Conexões SSH
- **Bash/curl** - Testes rápidos

## 🔧 Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- Git

### 1. Clone o repositório

```bash
git clone https://github.com/EricSL07/web-snmp.git
cd web-snmp
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
DATABASE_URL="postgresql://app:apppass@localhost:5432/appdb?schema=public"
ANSIBLE_API_URL=http://localhost:5000
ZABBIX_URL=http://localhost:8080/api_jsonrpc.php
ZABBIX_USER=Admin
ZABBIX_PASSWORD=zabbix
JWT_SECRET=sua-chave-secreta-muito-segura
```

### 4. Inicie a infraestrutura

```bash
# Iniciar containers Docker
cd infra
docker-compose up -d

# Voltar para raiz do projeto
cd ..

# Configurar banco de dados
npx prisma generate
npx prisma migrate deploy
```

### 5. Inicie a aplicação

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 🌐 Serviços Disponíveis

Após iniciar a infraestrutura, os seguintes serviços estarão disponíveis:

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Web App** | http://localhost:3000 | Interface principal Next.js |
| **Prisma Studio** | http://localhost:5555 | Gerenciamento do banco |
| **Zabbix Web** | http://localhost:8080 | Interface de monitoramento |
| **Ansible API** | http://localhost:5000 | API de automação |
| **PostgreSQL** | localhost:5432 | Banco de dados |
| **Mock Switch** | localhost:2222 (SSH) | Switch simulado |

### 🔐 Credenciais Padrão

- **Zabbix**: Admin / zabbix
- **Mock Switch SSH**: admin / admin123
- **PostgreSQL**: app / apppass

## 🧪 Testes

O projeto inclui um sistema completo de testes automatizados:

```bash
# Teste rápido (curl)
npm run test:quick

# Teste completo (Node.js)
npm run test:apis

# Teste de integração específico
npm run test:integration
```

### O que é testado:
- ✅ Conectividade de APIs
- ✅ Autenticação Zabbix
- ✅ Execução de playbooks Ansible
- ✅ Conexão SSH com switches
- ✅ Integração end-to-end

## 📁 Estrutura do Projeto

```
web-snmp/
├── src/                    # Código fonte Next.js
│   ├── app/               # App Router do Next.js
│   ├── lib/               # Bibliotecas e utilitários
│   └── middleware.ts      # Middleware de autenticação
├── prisma/                # Schema e migrações do banco
├── infra/                 # Infraestrutura Docker
├── ansible/               # Playbooks e inventários
├── ansible-api/           # API Flask do Ansible
├── tests/                 # Testes automatizados
├── public/                # Arquivos estáticos
└── docs/                  # Documentação adicional
```

## 🔄 Fluxo de Trabalho

### 1. Monitoramento
- Zabbix coleta métricas dos switches
- Dashboard exibe informações em tempo real
- Alertas são gerados automaticamente

### 2. Automação
- Playbooks Ansible configuram switches
- API permite execução remota
- Logs são armazenados no banco

### 3. Gerenciamento
- Interface web para cadastro de switches
- Sistema de usuários com autenticação
- Prisma Studio para administração

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🙏 Referências

- [Zabbix](https://www.zabbix.com/) - Sistema de monitoramento
- [Ansible](https://www.ansible.com/) - Automação
- [Next.js](https://nextjs.org/) - Framework React
- [Prisma](https://www.prisma.io/) - ORM moderno
- [Docker](https://www.docker.com/) - Containerização
