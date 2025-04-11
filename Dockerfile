# 使用官方 Bun 1.2.8 base image（支援 x86_64）
FROM oven/bun:1.2.8 as base

# 設定工作目錄
WORKDIR /app

# 安裝 Chrome 依賴項和 smbclient
RUN apt-get update && apt-get install -y \
    smbclient \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# 安裝 Chrome (使用 puppeteer 推薦的方式)
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# 複製專案檔案
COPY . .

# 設置 Puppeteer 的環境變數，告訴它使用安裝的 Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 安裝相依套件（自動讀取 bun.lockb 或 package.json）
RUN bun install

# 建立 upload_file 目錄
RUN mkdir -p upload_file/uploads && chmod 755 upload_file/uploads

# 建立 Next.js 專案
RUN bun run build

# -------- 生產階段用輕量 base image --------
FROM oven/bun:1.2.8 as runner

# 設定環境變數
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 安裝 Chrome 依賴項和 smbclient
RUN apt-get update && apt-get install -y \
    smbclient \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# 安裝 Chrome (使用 puppeteer 推薦的方式)
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# 設定工作目錄
WORKDIR /app

# 複製編譯後結果與 node_modules
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/next.config.ts ./next.config.ts

# 創建並設置上傳目錄的權限
RUN mkdir -p upload_file/uploads && chmod 755 upload_file/uploads

# 開啟必要的 port
EXPOSE 3000

# 啟動 Next.js 應用（使用 .next 產出）
CMD ["bun", "start"]
