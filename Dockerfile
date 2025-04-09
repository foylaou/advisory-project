# 使用官方 Bun 1.2.8 base image（支援 x86_64）
FROM oven/bun:1.2.8 as base

# 設定工作目錄
WORKDIR /app

# 複製專案檔案
COPY . .

# 安裝相依套件（自動讀取 bun.lockb 或 package.json）
RUN bun install

# 建立 Next.js 專案
RUN bun run build

# -------- 生產階段用輕量 base image --------
FROM oven/bun:1.2.8-slim as runner

# 設定環境變數
ENV NODE_ENV=production

# 設定工作目錄
WORKDIR /app

# 複製編譯後結果與 node_modules
COPY --from=base /app /app

# 開啟必要的 port
EXPOSE 3000

# 啟動 Next.js 應用（使用 .next 產出）
CMD ["bun", "start"]
