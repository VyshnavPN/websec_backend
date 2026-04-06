# Use a lightweight Alpine Linux image
FROM alpine:3.18

# 1. Install System Dependencies
# python3: For your engines
# nmap/whois: For recon module
# wget/perl/openssl: Required for Nikto to function
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

# 2. Manual Nikto Installation (Reliable Method)
RUN wget https://github.com/sullo/nikto/archive/master.tar.gz && \
    tar -xf master.tar.gz && \
    mkdir -p /usr/local/bin/nikto_files && \
    mv nikto-master/program/* /usr/local/bin/nikto_files/ && \
    ln -s /usr/local/bin/nikto_files/nikto.pl /usr/local/bin/nikto && \
    chmod +x /usr/local/bin/nikto && \
    rm master.tar.gz

# 3. Set Working Directory
WORKDIR /app

# 4. Install Node.js Dependencies
COPY package*.json ./
RUN npm install --production

# 5. Copy Application Source
# This copies your 'exploits' folder, 'server.js', etc.
COPY . .

# 6. Final Permissions Check
RUN chmod +x exploits/*.py

# 7. Expose C2 Port
EXPOSE 8080

# 8. Launch Command
CMD ["node", "server.js"]