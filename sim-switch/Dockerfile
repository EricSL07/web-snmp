FROM alpine:3.18

ENV SNMP_COMMUNITY=public
ENV SYSNAME=sim-switch
ENV USER=admin
ENV PASS=admin123

RUN apk add --no-cache openssh net-snmp net-snmp-tools bash tini python3

# Create user and sshd config
RUN adduser -D -s /bin/sh $USER && echo "$USER:$PASS" | chpasswd
RUN mkdir -p /run/sshd

# snmpd.conf will be generated at runtime using env vars

EXPOSE 22/tcp 161/udp

COPY start-sim.sh /usr/local/bin/start-sim.sh
RUN chmod +x /usr/local/bin/start-sim.sh
COPY simtemp.py /usr/local/bin/simtemp.py
RUN chmod +x /usr/local/bin/simtemp.py

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/start-sim.sh"]
