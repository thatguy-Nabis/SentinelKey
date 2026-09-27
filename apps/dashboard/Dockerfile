FROM node:20-alpine
RUN npm install -g pnpm@10.33.0
WORKDIR /app
COPY package.json ./
RUN pnpm install
COPY . .
RUN pnpm build
EXPOSE 5173
CMD ["pnpm", "preview", "--", "--host", "--port", "5173"]
