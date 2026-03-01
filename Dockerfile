FROM node:20-alpine

# Alpine uses 'apk' to install packages
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

# Railway uses a dynamic port, but we document 5000
EXPOSE 5000

CMD ["node", "server.js"]