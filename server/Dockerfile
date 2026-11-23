FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN npm prune --omit=dev

ENV NODE_ENV=production

USER node

EXPOSE 3002
CMD ["node", "server.js"]
