FROM node:20-alpine
RUN npm install -g pnpm@10.33.0
WORKDIR /app
COPY package.json ./
RUN pnpm install
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build && pnpm prune --prod
EXPOSE 4000
CMD ["node", "dist/index.js"]
