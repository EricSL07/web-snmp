FROM alpine:3.18

ENV SNMP_COMMUNITY=public
ENV SYSNAME=sim-switch
ENV USER=admin
ENV PASS=admin123

RUN apk add --no-cache openssh net-snmp net-snmp-tools bash tini

# Create user and sshd config
RUN adduser -D -s /bin/sh $USER && echo "$USER:$PASS" | chpasswd
RUN mkdir -p /run/sshd

# Create a minimal snmpd.conf to avoid duplicate entries
RUN cat > /etc/snmp/snmpd.conf <<'EOF'
agentAddress udp:0.0.0.0:1161
rocommunity public  default -V systemonly
syslocation Docker simulated switch
syscontact sim@example.com
EOF

EXPOSE 22/tcp 1161/udp

COPY start-sim.sh /usr/local/bin/start-sim.sh
RUN chmod +x /usr/local/bin/start-sim.sh

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/start-sim.sh"]
