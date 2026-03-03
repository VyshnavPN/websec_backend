FROM node:18-alpine

# 1. Install system dependencies
RUN apk update && \
    apk add --no-cache \
    nmap whois bind-tools python3 py3-pip perl perl-net-ssleay \
    --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community

# 2. Resilient Manual Nikto Installation
RUN wget https://github.com/sullo/nikto/archive/master.tar.gz && \
    tar -xf master.tar.gz && \
    mkdir -p /opt/nikto && \
    # Move content from the ONLY folder extracted into /opt/nikto
    mv nikto-*/program/* /opt/nikto/ && \
    ln -s /opt/nikto/nikto.pl /usr/bin/nikto && \
    chmod +x /usr/bin/nikto && \
    rm -rf master.tar.gz nikto-*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 8080
CMD ["node", "server.js"]