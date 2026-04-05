# Base
FROM node:20-bullseye

# Instalar Python + Nginx
RUN apt-get update && apt-get install -y python3 python3-pip nginx && rm -rf /var/lib/apt/lists/*

# =====================
# BACKEND
# =====================
WORKDIR /app/backend
COPY backend/ .
RUN pip3 install --no-cache-dir -r requirements.txt

# =====================
# FRONTEND
# =====================
WORKDIR /app/frontend
COPY frontend/package.json frontend/yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

COPY frontend/ .
RUN yarn build

# =====================
# NGINX
# =====================
COPY nginx.conf /etc/nginx/nginx.conf

# =====================
# START
# =====================
WORKDIR /app

CMD ["bash", "-c", "python3 backend/server.py & yarn --cwd frontend preview --host 0.0.0.0 & nginx -g 'daemon off;'"]