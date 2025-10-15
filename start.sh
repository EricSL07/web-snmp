#!/bin/bash

# Script de inicialização do Web-SNMP

echo "🌐 Iniciando Web-SNMP com Docker Compose..."
echo "========================================"

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
    cd infra && docker-compose down 2>/dev/null || true
    cd ..
}

# Função para iniciar os serviços
start_services() {
    echo "🚀 Construindo e iniciando todos os serviços..."
    docker-compose up --build -d
    
    echo "⏳ Aguardando serviços ficarem prontos..."
    sleep 10
    
    echo "🗄️  Executando migrações do banco..."
    docker-compose exec web-app npx prisma migrate deploy || echo "⚠️  Migrações já aplicadas ou erro"
}

# Função para mostrar status
show_status() {
    echo ""
    echo "📊 Status dos serviços:"
    echo "======================"
    docker-compose ps
    
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
            docker-compose down
            stop_old_containers
            ;;
        "logs")
            docker-compose logs -f
            ;;
        "test")
            run_tests
            ;;
        "restart")
            echo "🔄 Reiniciando serviços..."
            docker-compose restart
            show_status
            ;;
        *)
            check_docker
            stop_old_containers
            start_services
            show_status
            
            echo "💡 Comandos úteis:"
            echo "• ./start.sh stop     - Parar todos os serviços"
            echo "• ./start.sh logs     - Ver logs em tempo real"
            echo "• ./start.sh test     - Executar testes"
            echo "• ./start.sh restart  - Reiniciar serviços"
            ;;
    esac
}

main "$@"
#!/bin/bash

# Script de inicialização do Web-SNMP

echo "🌐 Iniciando Web-SNMP com Docker Compose..."
echo "========================================"

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
    cd infra && docker-compose down 2>/dev/null || true
    cd ..
}

# Função para iniciar os serviços
start_services() {
    echo "🚀 Construindo e iniciando todos os serviços..."
    docker-compose up --build -d
    
    echo "⏳ Aguardando serviços ficarem prontos..."
    sleep 10
    
    echo "🗄️  Executando migrações do banco..."
    docker-compose exec web-app npx prisma migrate deploy || echo "⚠️  Migrações já aplicadas ou erro"
}

# Função para mostrar status
show_status() {
    echo ""
    echo "📊 Status dos serviços:"
    echo "======================"
    docker-compose ps
    
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
            docker-compose down
            stop_old_containers
            ;;
        "logs")
            docker-compose logs -f
            ;;
        "test")
            run_tests
            ;;
        "restart")
            echo "🔄 Reiniciando serviços..."
            docker-compose restart
            show_status
            ;;
        *)
            check_docker
            stop_old_containers
            start_services
            show_status
            
            echo "💡 Comandos úteis:"
            echo "• ./start.sh stop     - Parar todos os serviços"
            echo "• ./start.sh logs     - Ver logs em tempo real"
            echo "• ./start.sh test     - Executar testes"
            echo "• ./start.sh restart  - Reiniciar serviços"
            ;;
    esac
}

main "$@"