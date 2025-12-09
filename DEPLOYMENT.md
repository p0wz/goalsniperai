# 🚀 GoalGPT Pro - Tam Profesyonel Ücretsiz Dağıtım

Sisteminiz şu anda **Kalıcı (Persistent) Cloud Veritabanı** ve **Kesintisiz Çalışma (Uptime)** özelliklerine sahiptir.

## 🛠️ 1. Adım: Veritabanı Kurulumu (Turso)
Verilerimiz (üyelikler, maç geçmişi) silinmesin diye Turso kullanacağız.

1. [Turso.tech](https://turso.tech/) adresine gidin ve GitHub ile giriş yapın.
2. "Create Database" diyip, "GoalGPT" gibi bir isim verin.
3. Bölge (Region) olarak size en yakın yeri (örn: `fra` - Frankfurt) seçin.
4. Database oluşunca **"Connect"** butonuna basın.
5. Şunları not alın:
   - **Database URL**: `libsql://...` ile başlayan adres.
   - **Auth Token**: "Generate Token" diyip oluşturduğunuz uzun şifre.

## 🌧️ 2. Adım: Backend Kurulumu (Render.com)
1. [Render.com Dashboard](https://dashboard.render.com/)'a gidin.
2. "New Web Service" > GitHub Deponuzu Bağlayın.
3. Ayarlar:
   - **Name**: `goalsniper-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
4. **Environment Variables** (Çevre Değişkenleri) ekleyin:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: (Rastgele uzun bir şifre)
   - `ADMIN_PASSWORD`: (Admin giriş şifreniz)
   - `TURSO_DATABASE_URL`: (1. Adımdaki `libsql://...` adresi)
   - `TURSO_AUTH_TOKEN`: (1. Adımdaki uzun token)
   - `ALLOWED_ORIGINS`: `https://goalsniper-frontend.pages.dev` (Frontend adresiniz, sonra güncelleyebilirsiniz)

## ⚡ 3. Adım: Frontend Kurulumu (Cloudflare Pages)
1. [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages**.
2. "Create Application" > "Connect to Git".
3. Ayarlar:
   - **Build command**: `npm run build`
   - **Output directory**: `frontend/dist`
   - **Root directory**: `frontend`
4. **Environment Variables**:
   - `VITE_API_URL`: `https://goalsniper-api.onrender.com` (Render'ın size verdiği URL)

## ⏰ 4. Adım: Uyku Modunu Engelleme (UptimeRobot)
Render.com ücretsiz sunucusu 15dk işlem olmazsa uyur ve maç takibi durur. Bunu engellemek için:

1. [UptimeRobot.com](https://uptimerobot.com/)'a ücretsiz üye olun.
2. "Add New Monitor" deyin.
3. Ayarlar:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: GoalGPT Ping
   - **URL**: `https://goalsniper-api.onrender.com/api/signals` (Render API adresiniz + /api/signals)
   - **Monitoring Interval**: 5 minutes (5 dakika)
4. Kaydedin.

Artık sisteminiz **7/24 çalışacak**, veriler asla silinmeyecek ve **tamamen ücretsiz** kalacaktır.
