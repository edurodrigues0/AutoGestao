# Cloudflare Tunnel (AutoGestão)

Use para expor **backend** (porta `8001`) e **frontend** (porta `3000`) com HTTPS público — útil para **webhooks e redirects do Asaas** sem ngrok.

## Instalar o `cloudflared`

- **Windows (winget):** `winget install --id Cloudflare.cloudflared`
- **Outros:** [Instalação oficial](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)

Confirme: `cloudflared --version`

## Modo rápido (sem domínio próprio)

Gera uma URL aleatória `*.trycloudflare.com` (muda a cada execução). Bom para teste rápido do **backend** só:

```powershell
cd C:\Code\AutoGestao
cloudflared tunnel --url http://127.0.0.1:8001
```

Copie a URL HTTPS mostrada e use:

- No painel Asaas (sandbox): webhook `https://SUA_URL.trycloudflare.com/api/webhooks/asaas`
- Em `backend/.env`: `BACKEND_URL=https://...` (se precisar)
- Para o **frontend** em outra URL, abra **outro terminal** e rode:

```powershell
cloudflared tunnel --url http://127.0.0.1:3000
```

Atualize `FRONTEND_URL` no `backend/.env` e `REACT_APP_BACKEND_URL` no `frontend/.env` com as URLs HTTPS correspondentes (reinicie API e `yarn start`).

## Modo recomendado (túnel nomeado + DNS na Cloudflare)

Requer conta **Cloudflare** com o domínio já apontando para os nameservers deles.

1. **Login (abre o navegador):**

   ```powershell
   cloudflared tunnel login
   ```

2. **Criar o túnel:**

   ```powershell
   cloudflared tunnel create autogestao
   ```

   Anote o **UUID** e o caminho do arquivo **`.json`** de credenciais (geralmente em `%USERPROFILE%\.cloudflared\`).

3. **Configurar rotas DNS** (exemplo com subdomínios `api` e `app`):

   ```powershell
   cloudflared tunnel route dns autogestao api.seudominio.com
   cloudflared tunnel route dns autogestao app.seudominio.com
   ```

   Substitua `seudominio.com` pelo seu domínio.

4. **Arquivo de config** na raiz do repositório:

   ```powershell
   copy cloudflared\config.example.yml cloudflared\config.yml
   ```

   Edite `cloudflared/config.yml`:

   - `tunnel:` → UUID do passo 2  
   - `credentials-file:` → caminho completo para o `.json` (pode ser o que a Cloudflare criou em `.cloudflared`)  
   - `hostname:` → os mesmos FQDN que você criou no DNS (`api.seudominio.com`, `app.seudominio.com`)

5. **Subir o túnel** (da raiz do repo):

   ```powershell
   cloudflared tunnel --config cloudflared/config.yml run
   ```

6. **Variáveis de ambiente**

   - `backend/.env`:  
     `FRONTEND_URL=https://app.seudominio.com`  
     `BACKEND_URL=https://api.seudominio.com`
   - `frontend/.env`:  
     `REACT_APP_BACKEND_URL=https://api.seudominio.com`

   Webhook Asaas: `https://api.seudominio.com/api/webhooks/asaas`

## Portas

Alinhado ao [`ngrok.yaml`](../ngrok.yaml) do projeto: backend **8001**, frontend **3000**. Se usar outra porta na API, ajuste `service:` no `config.yml`.

## Segurança

- Não commite `cloudflared/config.yml` nem arquivos `*.json` de credenciais (estão no `.gitignore` na raiz).
- Mantenha só `config.example.yml` versionado.
