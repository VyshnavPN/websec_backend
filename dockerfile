FROM node:20-alpine
# Install the Docker CLI so the container can run docker commands
RUN apt install -y docker.io
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]