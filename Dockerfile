# Use lightweight Alpine Linux
FROM alpine:3.18

# 1. Install System Dependencies
RUN apk add --no-cache \
    python3 \
    nmap \
    whois \
    wget \
    perl \
    perl-net-ssleay \
    openssl \
    nodejs \
    npm \
    bash

# 2. Resilient Manual Nikto Installation
RUN wget https://github.com/sullo/nikto/archive/master.tar.gz && \
    tar -xf master.tar.gz && \
    mkdir -p /usr/local/bin/nikto_files && \
    mv nikto-master/program/* /usr/local/bin/nikto_files/ && \
    ln -s /usr/local/bin/nikto_files/nikto.pl /usr/local/bin/nikto && \
    chmod +x /usr/local/bin/nikto && \
    rm master.tar.gz

# 3. Setup App Directory
WORKDIR /app

# 4. Install Node.js Backend Dependencies
COPY package*.json ./
RUN npm install --production

# 5. Copy Application Source
COPY . .

# 6. Final Permissions Check
RUN chmod +x exploits/*.py

EXPOSE 8080

# 7. Launch C2 Server
CMD ["node", "server.js"]