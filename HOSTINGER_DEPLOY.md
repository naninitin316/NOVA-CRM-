# Hostinger VPS Deployment

This guide deploys Nova CRM on a single Hostinger VPS with:

- `web/` served by Nginx
- `backend/` managed by PM2
- PostgreSQL running on the VPS

## 1. Server assumptions

- Ubuntu 24.04 LTS
- Domain already added in Hostinger
- SSH access to the VPS

## 2. Install system packages

```bash
apt update
apt install -y nginx git curl unzip build-essential postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
```

Verify:

```bash
node -v
npm -v
psql --version
pm2 -v
```

## 3. Create the database

```bash
sudo -u postgres psql
```

```sql
CREATE USER novacrm_user WITH ENCRYPTED PASSWORD 'StrongDatabasePassword123!';
CREATE DATABASE novacrm OWNER novacrm_user;
GRANT ALL PRIVILEGES ON DATABASE novacrm TO novacrm_user;
\q
```

## 4. Clone the project

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/naninitin316/NOVA-CRM-.git novacrm
cd /var/www/novacrm
```

## 5. Create production env files

Backend:

```bash
cp deployment/hostinger/backend.env.production.example backend/.env
nano backend/.env
```

Frontend:

```bash
cp deployment/hostinger/web.env.production.example web/.env
nano web/.env
```

## 6. Install dependencies

```bash
npm install --prefix backend
npm install --prefix web
```

## 7. Build and initialize production data

```bash
npm run build --prefix backend
npm run build --prefix web
npm run deploy:init --prefix backend
```

`npm run deploy:init --prefix backend` will:

- generate Prisma client
- push the schema
- build the backend
- create or update the super admin

Do not run `npm run db:seed --prefix backend` in production.

## 8. Start the backend with PM2

The PM2 config in this repo expects the app at `/var/www/novacrm`.

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Check the API:

```bash
pm2 status
curl http://127.0.0.1:3001/api/health
```

## 9. Configure Nginx

```bash
cp deployment/hostinger/nginx-novacrm.conf /etc/nginx/sites-available/novacrm
ln -s /etc/nginx/sites-available/novacrm /etc/nginx/sites-enabled/novacrm
nginx -t
systemctl restart nginx
```

Edit `/etc/nginx/sites-available/novacrm` first and replace:

- `yourdomain.com`
- `www.yourdomain.com`

## 10. Point the domain

In Hostinger DNS:

- create an `A` record for the root domain pointing to the VPS IP
- create an `A` record for `www` pointing to the VPS IP

Wait for DNS propagation.

## 11. Enable SSL

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 12. Login

After SSL is active, open:

```text
https://yourdomain.com
```

Use the super admin email and password you set in `backend/.env`.

## 13. Deploy updates later

```bash
cd /var/www/novacrm
git pull
npm install --prefix backend
npm install --prefix web
npm run build --prefix backend
npm run build --prefix web
pm2 restart nova-crm-api
systemctl reload nginx
```

If Prisma schema changes:

```bash
npm run deploy:init --prefix backend
```

## 14. Useful checks

API logs:

```bash
pm2 logs nova-crm-api
```

Nginx logs:

```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

Database connection test:

```bash
psql "postgresql://novacrm_user:YOUR_PASSWORD@localhost:5432/novacrm?schema=public"
```
