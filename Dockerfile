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
# 2. Resilient Manual Nikto Installation
RUN wget https://github.com/sullo/nikto/archive/master.tar.gz -O nikto.tar.gz && \
    tar -xzf nikto.tar.gz && \
    # Dynamically find the extracted folder regardless of its name
    extracted_dir=$(ls -d nikto-*) && \
    mkdir -p /usr/local/bin/nikto_files && \
    cp -r $extracted_dir/program/* /usr/local/bin/nikto_files/ && \
    ln -s /usr/local/bin/nikto_files/nikto.pl /usr/local/bin/nikto && \
    chmod +x /usr/local/bin/nikto && \
    rm -rf $extracted_dir nikto.tar.gz

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