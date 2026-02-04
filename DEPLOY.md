# Deploy to Render (Production)

This guide deploys the **backend** and **frontend** as two separate services on [Render](https://render.com).

## Prerequisites

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster and connection string
- A [Render](https://render.com) account
- Git repo (GitHub/GitLab) with this project

---

## 1. Backend (Web Service)

1. In Render: **New → Web Service**.
2. Connect your repo and set:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. **Environment variables** (Environment tab):

   | Key            | Value |
   |----------------|--------|
   | `NODE_ENV`     | `production` |
   | `MONGODB_URI`  | Your MongoDB Atlas connection string |
   | `SESSION_SECRET` | A long random string (e.g. run `openssl rand -hex 32`) |
   | `FRONTEND_URL` | Your frontend URL (e.g. `https://your-frontend.onrender.com`) |

   **Where to get these:**
   - **MONGODB_URI**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) → **Database** (left menu) → create or use a **cluster** (e.g. M0 free) → **Connect** → **Drivers** / **Connect your application** → copy the URI. Replace `<password>` with your database user password. The host must look like `cluster0.xxxxx.mongodb.net` — **do not** use Atlas SQL or Data Federation (`atlas-sql-...query.mongodb.net`), or the app will crash with "command createIndexes not found".
   - **SESSION_SECRET**: Generate a random string. On your computer run: `openssl rand -hex 32` (Mac/Linux/Git Bash), or use any password generator and paste a long random string (e.g. 32+ characters).
   - **FRONTEND_URL**: Set this **after** you deploy the frontend (step 2 below). It is the URL Render gives your Static Site (e.g. `https://lovely-car-rental.onrender.com`). You can add it later and redeploy the backend.

4. Deploy. Note the backend URL (e.g. `https://your-app-name.onrender.com`).

5. **MongoDB Atlas**: In Network Access, add `0.0.0.0/0` so Render’s IPs can connect.

6. **Seed admin** (one time): In Render shell for the backend service, run:
   ```bash
   npm run seed
   ```
   Default login: `admin` / `admin123`. Change in production via Add Admin or a new seed.

---

## 2. Frontend (Static Site)

1. In Render: **New → Static Site**.
2. Connect the same repo and set:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. **Environment variables** (add before or during build):

   | Key             | Value |
   |-----------------|--------|
   | `VITE_API_URL`  | Your backend URL, e.g. `https://your-app-name.onrender.com` |

   **Where to get this:** Use the URL of the **backend** Web Service you created in step 1 (e.g. `https://lovely-car-rental-api.onrender.com`). Do **not** add a trailing slash.

4. Deploy. Note the frontend URL (e.g. `https://your-frontend.onrender.com`).

5. Go back to the **backend** service and set:
   - `FRONTEND_URL` = your frontend URL (the one from step 4).
6. Redeploy the backend so CORS and cookies use the correct frontend origin.

---

## 3. Verify

- Open the frontend URL. You should see the car rental site.
- Go to **Admin** → log in with `admin` / `admin123` (or your seeded admin).
- Check Dashboard, Cars, Availability, Bookings, and report download.

---

## 4. Notes

- **Sessions**: Production uses MongoDB session store (`connect-mongo`), so sessions survive restarts.
- **Cookies**: Backend sets `SameSite=None; Secure` in production so cookies work across frontend and backend domains.
- **Uploads**: Car images are stored in the backend’s `uploads` folder. On Render, the filesystem is ephemeral; uploads are lost on redeploy. For persistent images, use cloud storage (e.g. Cloudinary) and store URLs in the database.
- **Free tier**: Render may spin down inactive services; the first request after idle can be slow.
- **HTTPS**: Use HTTPS for both frontend and backend; the app is configured for it.
