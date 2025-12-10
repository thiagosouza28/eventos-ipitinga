# HTTPS e headers seguros (Nginx + Certbot)

Guia para publicar o backend em Ubuntu com Nginx, TLS via Let's Encrypt e headers globais (COOP/COEP/OAC) sem avisos no navegador.

## Comandos rapidos (root ou sudo)

```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo systemctl enable --now nginx

sudo apt-get install -y certbot python3-certbot-nginx
# Emissor de certificado (ajuste o dominio):
sudo certbot --nginx -d api.seudominio.com
```

## Passo a passo

1. **Atualize .env para HTTPS e dominio unico**  
   - `APP_URL` e `API_URL`: use `https://api.seudominio.com` (nada de IP ou http).  
   - `CORS_ORIGINS`: mantenha apenas origens https que de fato usam a API.  
   - Reinicie o servico Node apos alterar (.env e porta devem casar com o proxy).

2. **Instale Nginx e Certbot** (comandos acima). Certifique-se de que a porta 80/443 estao liberadas no firewall/security group.

3. **Publique o arquivo `docs/nginx-https.conf` em `/etc/nginx/sites-available/eventos-ipitinga`**  
   - Substitua `api.seudominio.com` pelo dominio real.  
   - Ajuste `proxy_pass` se a API escutar em outra porta interna.  
   - Garanta que `root` do favicon aponte para o build do frontend (ou remova o bloco se o favicon vier do proprio backend).  
   - Habilite o host:  
     ```bash
     sudo ln -s /etc/nginx/sites-available/eventos-ipitinga /etc/nginx/sites-enabled/eventos-ipitinga
     sudo nginx -t && sudo systemctl reload nginx
     ```

4. **Emitir e renovar TLS**  
   - Execute o `certbot --nginx -d api.seudominio.com` (use `--staging` para testes).  
   - Certbot ajusta ssl_certificate/ssl_certificate_key e cria renovacao automatica. Verifique com `sudo systemctl status certbot.timer`.

5. **Forcar redirecionamento para HTTPS**  
   - Ja previsto no arquivo: bloco de porta 80 retorna 301 para `https://$host$request_uri`.  
   - Mantenha HSTS ativo (Strict-Transport-Security) para evitar volta ao http.

6. **Verificacao**  
   - `curl -I https://api.seudominio.com/api/health` deve exibir os headers:  
     `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, `Origin-Agent-Cluster: ?1`, `Strict-Transport-Security`, etc.  
   - Navegador sem avisos: console limpo sem "ignored" ou "not origin-keyed".

## Boas praticas resumidas

- Centralize COOP/COEP/OAC no Nginx (Express nao envia esses headers).  
- Nao misture IP e dominio nem http/https; use sempre `https://api.seudominio.com`.  
- Certifique-se de que favicon/imagens/pdf estao no mesmo dominio/https para evitar avisos.  
- Mantenha HSTS e redirecionamento 80 -> 443 ativos.  
- Se consumir recursos externos com COEP `require-corp`, habilite CORS ou o header `Cross-Origin-Resource-Policy` nesses recursos.  
- Apos renovar certificados ou alterar .env, recarregue o Nginx (`sudo systemctl reload nginx`) e o servico Node.
