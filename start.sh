#!/bin/bash

# Script de inicialização do Web-SNMP

echo "🌐 Iniciando Web-SNMP com Docker Compose..."
echo "========================================"

# Detectar qual comando de compose está disponível (docker-compose ou docker compose)
DC="docker-compose"
if ! command -v docker-compose > /dev/null 2>&1; then
    if command -v docker > /dev/null 2>&1 && docker compose version > /dev/null 2>&1; then
        DC="docker compose"
    fi
fi

# Função para verificar se o Docker está rodando
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker não está rodando. Inicie o Docker e tente novamente."
        exit 1
    fi
}

# Função para parar containers antigos
stop_old_containers() {
    echo "🔄 Parando containers antigos..."
    cd infra && $DC down 2>/dev/null || true
    cd ..
}

# Função para iniciar os serviços (prod-like)
start_services() {
    echo "🚀 Construindo e iniciando todos os serviços..."
    $DC up --build -d
    
    echo "⏳ Aguardando serviços ficarem prontos..."
    sleep 10
    
    echo "🗄️  Executando migrações do banco..."
    $DC exec web-app npx prisma migrate deploy || echo "⚠️  Migrações já aplicadas ou erro"
}

# Função para mostrar status
show_status() {
    echo ""
    echo "📊 Status dos serviços:"
    echo "======================"
    $DC ps
    
    echo ""
    echo "🌐 Serviços disponíveis:"
    echo "========================"
    echo "• Web App (Next.js):     http://localhost:3000"
    echo "• Prisma Studio:         http://localhost:5555"
    echo "• Zabbix Web:            http://localhost:8080"
    echo "• Ansible API:           http://localhost:5000"
    echo "• PostgreSQL:            localhost:5432"
    echo "• Mock Switch (SSH):     localhost:2222"
    echo ""
    echo "🔐 Credenciais:"
    echo "• Zabbix:               Admin / zabbix"
    echo "• Mock Switch SSH:      admin / admin123"
    echo "• PostgreSQL:           app / apppass"
}

# Função para executar testes
run_tests() {
    echo "🧪 Executando testes..."
    sleep 5
    npm run test:quick
}

# Função principal
main() {
    case "$1" in
        "stop")
            echo "🛑 Parando todos os serviços..."
            $DC down
            stop_old_containers
            ;;
        "dev")
            echo "🧪 Iniciando em modo desenvolvimento com docker-compose.dev.yml..."
            check_docker
            echo "🔄 Parando instâncias de desenvolvimento se existirem..."
            $DC -f docker-compose.dev.yml down 2>/dev/null || true
            echo "🚀 Subindo serviços de desenvolvimento (monta o código e roda npm run dev)..."
            $DC -f docker-compose.dev.yml up --build -d
            echo "⏳ Aguardando services..."
            sleep 5
            echo "🗄️  Gerando Prisma client e aplicando migrações em dev (o container já executa isso na inicialização)..."
            echo "⏳ Aguardando 10s para que o processo interno do container conclua npm install / prisma generate..."
            sleep 10
            echo "🗄️  Garantindo dependências, aplicando migrations (prisma migrate deploy) e gerando Prisma Client no container de dev..."
            # Instalar dependências se necessário e aplicar migrations + gerar client no container de desenvolvimento
            # Garantir que o comando rode no diretório /app dentro do container
            $DC -f docker-compose.dev.yml exec -w /app web-app-dev sh -lc "npm install --no-audit --no-fund --silent || true; npx prisma migrate deploy || echo '⚠️  Falha ao aplicar migrations (ou já aplicadas)'; npx prisma generate || echo '⚠️  Falha ao gerar Prisma Client'"
            echo "�📄 Se houver problemas, veja os logs do container web-app-dev:"
            echo "   $DC -f docker-compose.dev.yml logs -f web-app-dev"
            show_status
            ;;
        "logs")
            $DC logs -f
            ;;
        "test")
            run_tests
            ;;
        "restart")
            echo "🔄 Reiniciando serviços..."
            $DC restart
            show_status
            ;;
        *)
            check_docker
            stop_old_containers
            start_services
            show_status
            
            echo "💡 Comandos úteis:"
            echo "• ./start.sh dev      - Iniciar em modo desenvolvimento (docker-compose.dev.yml)"
            echo "• ./start.sh stop     - Parar todos os serviços"
            echo "• ./start.sh logs     - Ver logs em tempo real"
            echo "• ./start.sh test     - Executar testes"
            echo "• ./start.sh restart  - Reiniciar serviços"
            ;;
    esac
}

main "$@"