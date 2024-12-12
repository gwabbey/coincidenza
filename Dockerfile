FROM node:20-alpine
WORKDIR /app

COPY package.json bun.lockb ./
RUN npm install -g pnpm
RUN pnpm install

COPY . .
RUN pnpm run build

ENV PORT=3003

CMD ["pnpm", "run", "start"]
