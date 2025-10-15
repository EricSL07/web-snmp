#!/bin/sh
set -e

# Generate SSH host keys if missing
if [ ! -f /etc/ssh/ssh_host_rsa_key ]; then
    ssh-keygen -A || true
fi

# Prepare snmpd.conf from env
SNMP_COMMUNITY_VALUE="${SNMP_COMMUNITY:-public}"
SYSNAME_VALUE="${SYSNAME:-sim-switch}"
cat > /etc/snmp/snmpd.conf <<EOF
agentAddress udp:0.0.0.0:161
com2sec notConfigUser  default  ${SNMP_COMMUNITY_VALUE}
group   notConfigGroup v2c      notConfigUser
view    systemview     included .1
access  notConfigGroup ""       any      noauth   exact  systemview none none

sysName ${SYSNAME_VALUE}
sysLocation Docker simulated switch
sysContact sim@example.com

# Expose simulated temperature via pass_persist under 1.3.6.1.4.1.8072.9999.1
pass_persist 1.3.6.1.4.1.8072.9999.1 /usr/bin/env python3 /usr/local/bin/simtemp.py
EOF

# Ensure runtime dir exists
mkdir -p /var/run/net-snmp

# Start snmpd in background
/usr/sbin/snmpd -f -Lo &

# Start sshd in foreground to keep container alive
exec /usr/sbin/sshd -D
