# Deploying FamilyCare — AWS (student / Learner Lab) + Vercel

```
 Browser ──HTTPS──► Vercel (React frontend)           free
    │
    └──HTTPS──► familycare.duckdns.org                 free domain
                  │
                  ▼  AWS EC2 Ubuntu server (paid from your student credits)
                 nginx (HTTPS, Let's Encrypt)
                  └─► api-gateway :3000
                        ├─► auth-service   :3001 ─┐
                        ├─► family-service :3002 ─┼─► MySQL  (Docker, :3307)
                        └─► health-service :3003 ─┴─► Redis  (Docker, :6379)
```

Only ports 22 (SSH), 80 and 443 are open to the internet. The services and
databases listen on `127.0.0.1` only.

> **Important — AWS Academy Learner Lab limits**
> - Your server runs **only while the lab session is active**. When the session
>   ends, AWS stops the server and the app is offline until you start the lab again.
>   Everything (databases + services) starts again automatically when the server starts.
> - Only regions **us-east-1 (N. Virginia)** and **us-west-2 (Oregon)** are allowed.
>   Use **us-east-1**, where the ready-made key pair `vockey` exists.
> - Stop the server when you don't need it, to save credits.

Total time: about 45 minutes.

---

## 1. Push both projects to GitHub

The server downloads the backend from GitHub, and Vercel builds the frontend
from GitHub. In each project folder:

```bash
git add -A
git commit -m "Prepare for deployment"
git pull --rebase
git push
```

## 2. Start the lab and open the AWS console

AWS Academy → your course → **Modules → Learner Lab** → **Start Lab**.
Wait until the dot next to "AWS" turns **green**, then click **AWS**.
In the top-right corner, make sure the region is **N. Virginia (us-east-1)**.

## 3. Create the server

Search **EC2** → **Launch instance**:

| Setting | Value |
|---|---|
| Name | `familycare` |
| Image (AMI) | **Ubuntu Server 24.04 LTS** (64-bit x86) |
| Instance type | **t3.small** (2 GB RAM). `t3.medium` is faster but uses credits faster. |
| Key pair | **vockey** |
| Network settings → **Edit** | *Create security group*, name `familycare-sg`, with these inbound rules: |
| | SSH, TCP 22, Source: Anywhere (0.0.0.0/0) |
| | HTTP, TCP 80, Source: Anywhere (0.0.0.0/0) |
| | HTTPS, TCP 443, Source: Anywhere (0.0.0.0/0) |
| Storage | **20 GiB**, gp3 |

Click **Launch instance**.

## 4. Give the server a fixed IP (Elastic IP)

Without this, the IP changes every time the lab restarts the server.

EC2 → **Elastic IPs** (left menu) → **Allocate Elastic IP address** → **Allocate**.
Then select it → **Actions → Associate Elastic IP address** → choose the
`familycare` instance → **Associate**. Copy the IP address.

## 5. Get a free domain name (needed for HTTPS)

1. Go to <https://www.duckdns.org> and sign in (e.g. with Google).
2. Create a subdomain, e.g. `familycare` → you get `familycare.duckdns.org`.
3. Put your **Elastic IP** in the *current ip* box → **update ip**.

## 6. Open a terminal on the server and run the setup script

**Easiest (in the browser):** EC2 → Instances → select `familycare` →
**Connect** → tab **EC2 Instance Connect** → username `ubuntu` → **Connect**.

<details>
<summary>Alternative: SSH from Windows PowerShell</summary>

In the Learner Lab page click **AWS Details** → **Download PEM** (`labsuser.pem`). Then:

```powershell
$key = "C:\Users\HP\Downloads\labsuser.pem"
icacls $key /inheritance:r
icacls $key /grant:r "$($env:USERNAME):(R)"
ssh -i $key ubuntu@YOUR_ELASTIC_IP
```
</details>

In the server terminal, run:

```bash
git clone https://github.com/Subhajit7710/FamilyCareBackend.git
cd FamilyCareBackend
bash deploy/setup-server.sh familycare.duckdns.org your-email@gmail.com
```

- Private repo? Git asks for your GitHub username and a **personal access token**
  (GitHub → Settings → Developer settings → Personal access tokens) as the password.
- The script takes ~5–10 minutes. It installs everything, adds swap memory,
  generates passwords and a JWT secret, starts MySQL/Redis/the 4 services, and
  gets the HTTPS certificate.

When it finishes, open **https://familycare.duckdns.org/gateway/status**. You should see:

```json
{"success":true,"status":{"auth":"healthy","family":"healthy","health":"healthy"}}
```

## 7. Deploy the frontend on Vercel (free)

1. <https://vercel.com> → sign in with GitHub → **Add New → Project** →
   import **FamilyCareFrontend**. Vercel detects Vite automatically.
2. **Environment Variables** → add
   `VITE_API_URL` = `https://familycare.duckdns.org` (no slash at the end).
3. **Deploy**. You get a URL like `https://familycare-xxxx.vercel.app`.

## 8. Lock the API to your frontend (recommended)

On the server, re-run the script with your Vercel URL as the third argument:

```bash
cd ~/FamilyCareBackend
bash deploy/setup-server.sh familycare.duckdns.org your-email@gmail.com https://familycare-xxxx.vercel.app
```

Done! Open your Vercel URL, register, and log in.

---

## Every time you want the app online

1. AWS Academy → Learner Lab → **Start Lab** → wait for the green dot → **AWS**.
2. EC2 → Instances: if `familycare` shows **Stopped**, select it →
   **Instance state → Start**.
3. Wait ~1 minute. MySQL, Redis and the 4 services start by themselves.
   The Elastic IP keeps your domain working.

## Updating the app later

- **Frontend:** `git push` → Vercel redeploys automatically.
- **Backend:** `git push`, then in the server terminal:
  ```bash
  cd ~/FamilyCareBackend && bash deploy/update.sh
  ```

## Useful server commands

| Command | What it does |
|---|---|
| `pm2 status` | Are the 4 services running? |
| `pm2 logs` / `pm2 logs health-service` | Live logs |
| `pm2 restart all` | Restart all services |
| `sudo docker ps` | Are MySQL and Redis running? |
| `sudo docker exec -it familycare-mysql mysql -u root -p` | MySQL shell (root password is in `~/FamilyCareBackend/.env`) |
| `cat ~/FamilyCareBackend/.env` | The generated passwords / JWT secret |

## Troubleshooting

| Problem | Fix |
|---|---|
| Site doesn't load at all | Is the lab running and the instance **Running**? Check the security group has ports 80/443, and that DuckDNS has your Elastic IP. |
| Certificate step failed | DNS was not ready. Wait a minute, then `sudo certbot --nginx -d familycare.duckdns.org -m you@gmail.com --agree-tos --redirect` |
| Frontend shows network/CORS errors | `VITE_API_URL` on Vercel must be exactly `https://familycare.duckdns.org`, and step 8's URL must match your Vercel URL exactly. Redeploy Vercel after changing variables. |
| Refreshing a page on Vercel gives 404 | Make sure `vercel.json` is committed in the frontend repo. |
| EC2 Instance Connect fails | Use the SSH option in step 6. |
| Reminders at the wrong time | The script sets the server to `Asia/Kolkata`. Check with `timedatectl`. |

## Local development still works as before

Nothing changed for running on your PC: the code falls back to `localhost`
when a setting is missing. `.env.example` files show every available setting.
