FROM oven/bun:alpine
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

ENV PORT=3003

CMD ["bun", "run", "start"]