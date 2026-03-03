FROM node:18-alpine

# 1. Install system dependencies via Edge Community
RUN apk update && \
    apk add --no-cache \
    nmap whois bind-tools python3 py3-pip perl perl-net-ssleay \
    --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community

# 2. Corrected Manual Nikto Installation
# We move the folder contents dynamically to avoid naming errors
RUN wget https://github.com/sullo/nikto/archive/master.tar.gz && \
    tar -xf master.tar.gz && \
    mkdir -p /opt/nikto && \
    cp -rf nikto-master/* /opt/nikto/ && \
    ln -s /opt/nikto/program/nikto.pl /usr/bin/nikto && \
    chmod +x /usr/bin/nikto && \
    rm -rf master.tar.gz nikto-master

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 8080
CMD ["node", "server.js"]