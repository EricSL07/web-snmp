FROM python:3.11-slim
RUN apt-get update && apt-get install -y sshpass openssh-client && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir ansible==9.7.0 flask==3.0.3 paramiko
# Instalar coleções necessárias para módulos de rede Cisco
RUN ansible-galaxy collection install cisco.ios ansible.netcommon
WORKDIR /app
COPY app.py .
ENV ANSIBLE_HOST_KEY_CHECKING=False
EXPOSE 5000
CMD ["python", "app.py"]
