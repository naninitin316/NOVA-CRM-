# Deployment Guide

For Hostinger VPS deployment, use [HOSTINGER_DEPLOY.md](/Users/nitin/CRM%20Project/HOSTINGER_DEPLOY.md). It is the quickest path for this codebase because Nova CRM needs Node.js, PostgreSQL, Prisma, and a static frontend served together.

## Backend Deployment

### Option 1: Railway / Render

1. Push your code to GitHub
2. Create a new PostgreSQL database on Railway or Render
3. Deploy the backend service:
   - **Root directory**: `backend`
   - **Build command**: `npm install && npx prisma generate && npm run build`
   - **Start command**: `npm start`
4. Set environment variables:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=<generate-a-strong-secret>
   JWT_EXPIRES_IN=7d
   PORT=3001
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend-domain.com
   APP_URL=https://your-frontend-domain.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=<smtp-user>
   SMTP_PASS=<smtp-password-or-app-password>
   SMTP_FROM="Nova CRM <no-reply@yourdomain.com>"
   ```
5. Create the production super admin and push the schema:
   ```
   SUPER_ADMIN_NAME="Your Name"
   SUPER_ADMIN_EMAIL="you@company.com"
   SUPER_ADMIN_PASSWORD="<strong-temporary-password>"
   SUPER_ADMIN_COMPANY="Platform"
   npm run deploy:init
   ```
   Do not use `npm run db:seed` in production; that command is for demo data.

### Option 2: Docker

```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY prisma ./prisma
RUN npx prisma generate
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: crm_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/crm_db
      JWT_SECRET: your-production-secret
      NODE_ENV: production
    depends_on:
      - db

volumes:
  pgdata:
```

### Option 3: VPS (Ubuntu)

```bash
# Install Node.js and PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql

# Setup database
sudo -u postgres createdb crm_db

# Deploy backend
cd backend
npm install
npm run deploy:init

# Use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name crm-api
pm2 save
pm2 startup
```

## Frontend Deployment (React + Vite)

### Option 1: Vercel / Netlify

```bash
cd web
npm run build
# Deploy the 'dist' folder
```

Environment variable:
```
VITE_API_URL=https://api.yourdomain.com/api
```

### Option 2: Static hosting with Nginx

```bash
cd web
npm run build
# Copy dist/ to /var/www/crm
```

Nginx config:
```nginx
server {
    listen 80;
    root /var/www/crm;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api { proxy_pass http://localhost:3001; }
}
```

### Option 3: Docker (full stack)

See docker-compose example in backend section. Add a web service:

```dockerfile
# web/Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

## Legacy Mobile App

The `mobile/` folder contains an Expo React Native app. The primary frontend is the `web/` React application. Use `web/` for browser-based CRM access.

## Environment Variables

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@host:5432/crm_db |
| JWT_SECRET | Secret for signing JWTs | random-64-char-string |
| JWT_EXPIRES_IN | Token expiration | 7d |
| PORT | Server port | 3001 |
| NODE_ENV | Environment | production |
| CORS_ORIGIN | Allowed frontend origins | https://app.example.com |
| APP_URL | Frontend login URL used in welcome emails | https://app.example.com |
| SMTP_HOST | SMTP server host | smtp.gmail.com |
| SMTP_PORT | SMTP server port | 587 |
| SMTP_SECURE | Use implicit TLS. Use true for port 465 | false |
| SMTP_USER | SMTP username | user@gmail.com |
| SMTP_PASS | SMTP password or app password | xxxx xxxx xxxx xxxx |
| SMTP_FROM | Sender name/address | Nova CRM <user@gmail.com> |
| MAIL_TEST_TO | Optional CLI mail test recipient | test@example.com |
| SUPER_ADMIN_NAME | Initial super admin name | Sofia Admin |
| SUPER_ADMIN_EMAIL | Initial super admin email | admin@example.com |
| SUPER_ADMIN_PASSWORD | Initial super admin password | strong-password |
| SUPER_ADMIN_COMPANY | Platform company name for super admin | Platform |
| SUPER_ADMIN_DEPARTMENT | Super admin department | Platform |
| SUPER_ADMIN_PHONE | Optional super admin phone | +91... |

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API base URL | https://api.example.com/api |

## Security Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Use HTTPS in production
- [ ] Set restrictive CORS_ORIGIN
- [ ] Use environment variables (never commit .env)
- [ ] Use SMTP app passwords/API keys, not personal account passwords
- [ ] Use a verified sender/domain for production emails
- [ ] Enable PostgreSQL SSL in production
- [ ] Set up rate limiting (recommended: express-rate-limit)
- [ ] Regular database backups
- [ ] Keep dependencies updated

## Monitoring

Recommended tools:
- **API**: PM2, Datadog, or New Relic
- **Database**: pgAdmin, Supabase dashboard
- **Frontend**: Sentry for error tracking
- **Uptime**: UptimeRobot or Pingdom

## Scaling

- Use connection pooling (PgBouncer) for PostgreSQL
- Add Redis for session caching
- Use a load balancer for multiple API instances
- CDN for static frontend assets
