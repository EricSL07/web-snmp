---
name: Integração Zabbix + Ansible (Dashboard e Comandos)
about: Registra e acompanha a entrega de métricas, portas e execução de playbooks por host Zabbix
title: "Integração Zabbix + Ansible: dashboard, portas e comandos por host (SWITCH-CISCO)"
labels: enhancement, zabbix, ansible, frontend, backend
assignees: ""
---

## Contexto

- Objetivo: unificar observabilidade (Zabbix) e operação (Ansible) dos switches na dashboard, com foco inicial no host "SWITCH-CISCO".
- Resultado esperado: visualizar temperatura, tráfego e portas (operacionais) e executar playbooks Cisco diretamente da página do host.

## Descrição

Integrações e funcionalidades entregues/previstas:

- Zabbix
  - Endpoints server-side para consulta de hosts, itens, séries históricas e sumário de portas.
  - Temperatura detectada por itens Cisco e genéricos (unidades °C), tráfego por interface (net.if.in/out).
  - Tabela de portas exibindo somente interfaces `oper=up`, com VLAN, velocidade, In/Out bps.

- UI (Next.js)
  - Dashboard lista hosts Zabbix e abre página dedicada por host.
  - Gráficos com auto-refresh independente (temperatura ≈ 180s; tráfego ≈ 60s).
  - Página do host: cards (temperatura/tráfego), tabela de portas e resumo (IP, status, uptime).
  - Página de comandos: Runner de Ansible com presets (Versão, IP INT BRIEF), limit vinculado ao host selecionado.

- Ansible / Infra
  - API Flask (`/run`) recebe `playbook`, `extra_vars` (JSON) e `limit` (host/grupo) e invoca `ansible-playbook`.
  - `ansible_connection=network_cli` com `cisco.ios.ios`; coleções `cisco.ios` e `ansible.netcommon` instaladas; `paramiko` instalado.
  - Host key checking desabilitado no runtime (evitar prompt de autenticidade no primeiro acesso).
  - Inventário adiciona `SWITCH-CISCO` (IP 172.17.0.29) como alvo Cisco.

## Tarefas

- [ ] Zabbix (API + Lib)
  - [ ] Implementar/validar: `GET /api/zbx/hosts`, `GET /api/zbx/host`, `GET /api/zbx/metrics/temp`, `GET /api/zbx/metrics/traffic`, `GET /api/zbx/ports`.
  - [ ] Detectar item de temperatura (Cisco e genérico) e montar série histórica.
  - [ ] Selecionar interface para tráfego (net.if.in/out) e alinhar timestamps.
  - [ ] Agregar portas por índice, filtrar `oper=up`, resolver VLAN e ordenar por total_bps.

- [ ] UI (Dashboard/Host)
  - [ ] Lista de hosts Zabbix com link para página do host.
  - [ ] Cards de Temperatura e Tráfego com atualização periódica.
  - [ ] Tabela de portas (up-only) com VLAN, velocidade e In/Out em Mb/s.
  - [ ] Resumo com nome, IP, status e uptime.

- [ ] UI (Comandos)
  - [ ] `AnsibleRunner` com campo "Limit" e presets: Versão (`cisco_show_version.yml`) e IP INT BRIEF (`cisco_show_ip_int_brief.yml`).
  - [ ] Autopreencher o limit com o host atual (ex.: `SWITCH-CISCO`).
  - [ ] Exibir rc, stdout e stderr na interface.

- [ ] Ansible API / Infra
  - [ ] `POST /run` aceita `playbook`, `extra_vars`, `limit` e executa playbook com `-l`.
  - [ ] Dockerfile com `paramiko`, coleções `cisco.ios`/`ansible.netcommon` e `ANSIBLE_HOST_KEY_CHECKING=False`.
  - [ ] Healthcheck simples em `/health`.

- [ ] Inventário & Playbooks
  - [ ] Inventário `dev/hosts.ini` com grupo `[cisco]` e host `SWITCH-CISCO` (network_cli).
  - [ ] Playbooks: `cisco_show_version.yml`, `cisco_show_ip_int_brief.yml`.

## Critérios de aceite

- Dashboard/Host
  - [ ] `/dashboard/zbx/[hostid]` renderiza gráficos de temperatura e tráfego sem erros.
  - [ ] Tabela de portas exibe somente `oper=up`, com VLAN e valores de tráfego (Mb/s) consistentes.
  - [ ] Sidebar mostra nome, IP e uptime quando disponíveis.

- API Zabbix
  - [ ] `GET /api/zbx/hosts` lista "SWITCH-CISCO" (status correto e IP).
  - [ ] `GET /api/zbx/host?hostid=<id>` retorna `ok: true` com detalhes e uptime (se houver item).
  - [ ] `GET /api/zbx/metrics/*` retornam séries com labels e valores alinhados por timestamp.
  - [ ] `GET /api/zbx/ports?hostid=<id>` retorna interfaces `oper=up` com VLAN resolvida (quando item existir).

- Comandos/Ansible
  - [ ] `/dashboard/zbx/[hostid]/comandos` configura automaticamente o "Limit" com o host atual.
  - [ ] Preset “VERSÃO (Cisco)” executa `cisco_show_version.yml` e exibe a saída no painel.
  - [ ] Preset “SHOW IP INT BRIEF” executa `cisco_show_ip_int_brief.yml` e exibe a saída no painel.
  - [ ] Permite informar `ansible_user` e `ansible_password` via "Extra Vars (JSON)" para autenticação.

- Infra
  - [ ] `GET /health` de `ansible-api` retorna `{ "ok": true }`.
  - [ ] `POST /run` com `ping.yml` (limit mock) retorna `rc=0` e saída "PONG".
  - [ ] `POST /run` com Cisco playbooks e `limit="SWITCH-CISCO"` executa contra o device (pode falhar por credenciais se não fornecidas, mas sem erro de host key/paramiko ausente).

## Referências

- Zabbix API
  - Visão geral e referência: https://www.zabbix.com/documentation/current/en/manual/api
  - Autenticação (user.login) e uso do token: https://www.zabbix.com/documentation/current/en/manual/api/reference/user/login
  - Items e history.get: https://www.zabbix.com/documentation/current/en/manual/api/reference
  - Chaves de itens (item key): https://www.zabbix.com/documentation/current/en/manual/config/items/item/key

- Ansible (Rede/Cisco)
  - Coleção Cisco IOS: https://docs.ansible.com/ansible/latest/collections/cisco/ios/index.html
  - Módulo ios_command: https://docs.ansible.com/ansible/latest/collections/cisco/ios/ios_command_module.html
  - Conexão network_cli: https://docs.ansible.com/ansible/latest/collections/ansible/netcommon/network_cli_connection.html
  - Host key checking (config): https://docs.ansible.com/ansible/latest/reference_appendices/config.html#host-key-checking
  - Extra vars na CLI: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html#cmdoption-ansible-playbook-e

- Backend/Frameworks
  - Flask (3.x) docs: https://flask.palletsprojects.com/en/3.0.x/
  - Docker Compose: https://docs.docker.com/compose/

- Gráficos
  - Chart.js: https://www.chartjs.org/docs/latest/
  - react-chartjs-2: https://react-chartjs-2.js.org/

---

Observações:

- Forneça credenciais do dispositivo via "Extra Vars (JSON)" (ex.: `{"ansible_user":"<user>","ansible_password":"<pass>"}`).
- Host key checking foi desabilitado para facilitar primeiras conexões; revisar política de segurança para produção.
- `paramiko` instalado para `network_cli`; `ansible-pylibssh` é opcional.