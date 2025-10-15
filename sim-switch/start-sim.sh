#!/bin/sh
set -e

# Generate host keys if missing and start sshd in foreground
if [ ! -f /etc/ssh/ssh_host_rsa_key ]; then
	ssh-keygen -A || true
fi
exec /usr/sbin/sshd -D
