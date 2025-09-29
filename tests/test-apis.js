#!/usr/bin/env node

/**
 * Script para testar todas as APIs do projeto web-snmp
 * Testa: Zabbix API, Ansible API, Mock Switch SSH, e integração Ansible + Mock
 */

const axios = require('axios');
const { Client } = require('ssh2');

// Configurações
const config = {
  zabbix: {
    url: 'http://localhost:8080/api_jsonrpc.php',
    user: 'Admin',
    password: 'zabbix'
  },
  ansible: {
    url: 'http://localhost:5000'
  },
  mockSwitch: {
    host: 'localhost',
    port: 2222,
    username: 'admin',
    password: 'admin123'
  }
};

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Teste 1: Zabbix API
async function testZabbixAPI() {
  log('\n🔍 Testando Zabbix API...', colors.blue);
  
  try {
    // Primeiro, fazer login
    const loginResponse = await axios.post(config.zabbix.url, {
      jsonrpc: '2.0',
      method: 'user.login',
      params: {
        username: config.zabbix.user,
        password: config.zabbix.password
      },
      id: 1
    });

    if (loginResponse.data.result) {
      const authToken = loginResponse.data.result;
      log('✅ Zabbix Login: SUCESSO', colors.green);
      
      // Testar busca de hosts
      const hostsResponse = await axios.post(config.zabbix.url, {
        jsonrpc: '2.0',
        method: 'host.get',
        params: {
          output: ['hostid', 'host', 'status'],
          limit: 5
        },
        auth: authToken,
        id: 2
      });

      if (hostsResponse.data.result !== undefined) {
        log(`✅ Zabbix Hosts: ${hostsResponse.data.result.length} hosts encontrados`, colors.green);
        return true;
      } else if (hostsResponse.data.error) {
        log(`⚠️  Zabbix Hosts: ${hostsResponse.data.error.message}`, colors.yellow);
        return true; // Login funcionou, mesmo que não tenha hosts
      }
    } else if (loginResponse.data.error) {
      log(`❌ Zabbix Login: ${loginResponse.data.error.message}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Zabbix API: ${error.message}`, colors.red);
    return false;
  }
  
  return false;
}

// Teste 2: Ansible API
async function testAnsibleAPI() {
  log('\n🔧 Testando Ansible API...', colors.blue);
  
  try {
    // Testar endpoint de health
    const healthResponse = await axios.get(`${config.ansible.url}/health`, {
      timeout: 5000
    });
    
    if (healthResponse.status === 200) {
      log('✅ Ansible API Health: SUCESSO', colors.green);
    }

    // Testar endpoint de ping
    const pingResponse = await axios.post(`${config.ansible.url}/run`, {
      playbook: 'ping.yml',
      extra_vars: {}
    }, {
      timeout: 10000
    });

    if (pingResponse.status === 200) {
      log('✅ Ansible Ping Playbook: SUCESSO', colors.green);
      log(`📄 Resultado: ${JSON.stringify(pingResponse.data, null, 2)}`, colors.yellow);
      return true;
    }
  } catch (error) {
    log(`❌ Ansible API: ${error.message}`, colors.red);
    return false;
  }
}

// Teste 3: Mock Switch SSH
async function testMockSwitchSSH() {
  log('\n🖥️  Testando Mock Switch SSH...', colors.blue);
  
  return new Promise((resolve) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      log('✅ Mock Switch SSH: Conexão estabelecida', colors.green);
      
      // Executar comando de teste
      conn.exec('whoami', (err, stream) => {
        if (err) {
          log(`❌ Mock Switch Command: ${err.message}`, colors.red);
          conn.end();
          resolve(false);
          return;
        }
        
        stream.on('close', (code, signal) => {
          log(`✅ Mock Switch Command: Executado com sucesso (exit code: ${code})`, colors.green);
          conn.end();
          resolve(true);
        }).on('data', (data) => {
          log(`📄 Output: ${data.toString().trim()}`, colors.yellow);
        }).stderr.on('data', (data) => {
          log(`⚠️  Stderr: ${data.toString()}`, colors.yellow);
        });
      });
    }).on('error', (err) => {
      log(`❌ Mock Switch SSH: ${err.message}`, colors.red);
      resolve(false);
    }).connect({
      host: config.mockSwitch.host,
      port: config.mockSwitch.port,
      username: config.mockSwitch.username,
      password: config.mockSwitch.password
    });
    
    // Timeout de 10 segundos
    setTimeout(() => {
      log('❌ Mock Switch SSH: Timeout', colors.red);
      conn.end();
      resolve(false);
    }, 10000);
  });
}

// Teste 4: Integração Ansible + Mock Switch
async function testAnsibleMockIntegration() {
  log('\n🔗 Testando integração Ansible + Mock Switch...', colors.blue);
  
  try {
    // Executar playbook que conecta ao mock switch
    const response = await axios.post(`${config.ansible.url}/run`, {
      playbook: 'show_version.yml',
      extra_vars: {
        target_host: 'mock_switch'
      }
    }, {
      timeout: 30000
    });

    if (response.status === 200) {
      log('✅ Ansible → Mock Switch: SUCESSO', colors.green);
      log(`📄 Resultado: ${JSON.stringify(response.data, null, 2)}`, colors.yellow);
      return true;
    }
  } catch (error) {
    log(`❌ Ansible → Mock Switch: ${error.message}`, colors.red);
    return false;
  }
}

// Teste 5: Verificar portas abertas
async function testPorts() {
  log('\n🔌 Testando portas dos serviços...', colors.blue);
  
  const ports = [
    { service: 'Next.js App', port: 3000, type: 'http' },
    { service: 'Ansible API', port: 5000, type: 'http' },
    { service: 'Prisma Studio', port: 5555, type: 'http' },
    { service: 'Zabbix Web', port: 8080, type: 'http' },
    { service: 'PostgreSQL', port: 5432, type: 'tcp' },
    { service: 'Mock Switch SSH', port: 2222, type: 'tcp' },
    { service: 'Zabbix Server', port: 10051, type: 'tcp' }
  ];

  const results = [];
  
  for (const { service, port, type } of ports) {
    try {
      if (type === 'http') {
        const response = await axios.get(`http://localhost:${port}`, {
          timeout: 3000,
          validateStatus: () => true // Aceita qualquer status code
        });
        log(`✅ ${service} (${port}): Porta aberta`, colors.green);
        results.push(true);
      } else {
        // Para portas TCP não-HTTP, usar uma verificação de conexão simples
        const net = require('net');
        const socket = new net.Socket();
        
        const testConnection = new Promise((resolve, reject) => {
          socket.setTimeout(3000);
          socket.on('connect', () => {
            socket.destroy();
            resolve(true);
          });
          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Timeout'));
          });
          socket.on('error', (err) => {
            reject(err);
          });
          socket.connect(port, 'localhost');
        });
        
        await testConnection;
        log(`✅ ${service} (${port}): Porta aberta`, colors.green);
        results.push(true);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        log(`❌ ${service} (${port}): Porta fechada`, colors.red);
      } else if (error.code === 'ECONNRESET' || error.response) {
        log(`✅ ${service} (${port}): Porta aberta (serviço respondeu)`, colors.green);
        results.push(true);
        continue;
      } else {
        log(`⚠️  ${service} (${port}): ${error.message}`, colors.yellow);
      }
      results.push(false);
    }
  }
  
  return results.filter(r => r).length === ports.length;
}

// Função principal
async function runAllTests() {
  log('🚀 Iniciando testes das APIs do web-snmp...', colors.blue);
  log('==========================================', colors.blue);
  
  const results = {
    ports: await testPorts(),
    zabbix: await testZabbixAPI(),
    ansible: await testAnsibleAPI(),
    mockSwitch: await testMockSwitchSSH(),
    integration: await testAnsibleMockIntegration()
  };
  
  log('\n📊 RESUMO DOS TESTES:', colors.blue);
  log('==========================================', colors.blue);
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSOU' : '❌ FALHOU';
    const color = passed ? colors.green : colors.red;
    log(`${test.toUpperCase()}: ${status}`, color);
  });
  
  const totalPassed = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;
  
  log(`\n🎯 RESULTADO FINAL: ${totalPassed}/${totalTests} testes passaram`, 
       totalPassed === totalTests ? colors.green : colors.red);
  
  if (totalPassed === totalTests) {
    log('🎉 Todas as APIs estão funcionando perfeitamente!', colors.green);
  } else {
    log('⚠️  Algumas APIs precisam de atenção.', colors.yellow);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testZabbixAPI,
  testAnsibleAPI,
  testMockSwitchSSH,
  testAnsibleMockIntegration,
  testPorts,
  runAllTests
};