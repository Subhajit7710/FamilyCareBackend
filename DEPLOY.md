# Deploying FamilyCare (free) — Oracle Cloud + Vercel

```
 Browser ──HTTPS──► Vercel (React frontend)           free
    │
    └──HTTPS──► familycare.duckdns.org                 free domain
                  │
                  ▼  Oracle Cloud "Always Free" Ubuntu VM
                 nginx (HTTPS, Let's Encrypt)
                  └─► api-gateway :3000
                        ├─► auth-service   :3001 ─┐
                        ├─► family-service :3002 ─┼─► MySQL  (Docker, :3307)
                        └─► health-service :3003 ─┴─► Redis  (Docker, :6379)
```

Only ports 22 (SSH), 80 and 443 are open to the internet. The services and
databases listen on `127.0.0.1` only.

Total time: about 45 minutes. You do steps 1–5 in your browser, then one
command on the server does the rest.

---

## 1. Push both projects to GitHub

The server downloads the backend from GitHub, and Vercel builds the frontend
from GitHub, so both repos must contain the latest code (including your
uncommitted frontend changes).

In each project folder (PowerShell or Git Bash):

```bash
git add -A
git commit -m "Prepare for deployment"
git push
```

`.env` files are ignored by git on purpose. The server generates its own.

## 2. Create an Oracle Cloud account

1. Go to <https://signup.cloud.oracle.com> and sign up.
   A card is needed for identity verification; Always Free resources are not charged.
2. **Home region:** pick one close to you (e.g. *India West (Mumbai)* or
   *India South (Hyderabad)*). It cannot be changed later.

## 3. Create the server (VM)

Menu → **Compute → Instances → Create instance**

| Setting | Value |
|---|---|
| Name | `familycare` |
| Image | **Canonical Ubuntu 24.04** (click *Change image*) |
| Shape | *Change shape* → **Ampere** → `VM.Standard.A1.Flex`, **2 OCPU, 12 GB** (Always Free) |
| Networking | *Create new virtual cloud network* + *public subnet*, **Assign a public IPv4 address: Yes** |
| SSH keys | **Generate a key pair for me** → **Download private key** (keep it safe!) |
| Boot volume | default (50 GB is free) |

Click **Create**. When it is *Running*, copy the **Public IP address**.

> **"Out of capacity" error?** Free ARM servers are popular. Try another
> *Availability domain* in the same screen, or try again later.
> Upgrading the account to *Pay As You Go* (still free for Always Free resources)
> usually fixes this and also protects the VM from Oracle's idle-instance reclaim.
> If you do upgrade, set a budget alert under *Billing → Budgets*.

## 4. Open ports 80 and 443 in Oracle's firewall

Instance page → click the **Subnet** link → **Security** (or *Security Lists*) →
**Default Security List** → **Add Ingress Rules**:

| Source CIDR | IP Protocol | Destination Port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

(Port 22 for SSH is already there. The server's own internal firewall is
opened by the setup script.)

## 5. Get a free domain name (needed for HTTPS)

1. Go to <https://www.duckdns.org> and sign in (e.g. with Google).
2. Create a subdomain, e.g. `familycare` → you get `familycare.duckdns.org`.
3. Put the server's **public IP** in the *current ip* box → **update ip**.

## 6. Connect to the server and run the setup script

On Windows, open **PowerShell**. First restrict the key file (SSH refuses keys
that other users can read):

```powershell
$key = "C:\Users\HP\Downloads\ssh-key-XXXX.key"   # your downloaded key
icacls $key /inheritance:r
icacls $key /grant:r "$($env:USERNAME):(R)"
ssh -i $key ubuntu@YOUR_PUBLIC_IP
```

Type `yes` the first time. You are now on the server. Run:

```bash
git clone https://github.com/Subhajit7710/FamilyCareBackend.git
cd FamilyCareBackend
bash deploy/setup-server.sh familycare.duckdns.org your-email@gmail.com
```

- Private repo? Git asks for your GitHub username and a **personal access token**
  (GitHub → Settings → Developer settings → Personal access tokens) as the password.
- The script takes ~5–10 minutes. It installs everything, generates passwords
  and a JWT secret, starts MySQL/Redis/the 4 services, and gets the HTTPS certificate.

When it finishes, open **https://familycare.duckdns.org/gateway/status**. You should see:

```json
{"success":true,"status":{"auth":"healthy","family":"healthy","health":"healthy"}}
```

## 7. Deploy the frontend on Vercel

1. <https://vercel.com> → sign in with GitHub → **Add New → Project** →
   import **FamilyCareFrontend**. Vercel detects Vite automatically.
2. **Environment Variables** → add
   `VITE_API_URL` = `https://familycare.duckdns.org` (no slash at the end).
3. **Deploy**. You get a URL like `https://familycare-xxxx.vercel.app`.

## 8. Lock the API to your frontend (recommended)

Back on the server (SSH), re-run the setup script with your Vercel URL as the
third argument. Now only your site may call the API from a browser:

```bash
cd ~/FamilyCareBackend
bash deploy/setup-server.sh familycare.duckdns.org your-email@gmail.com https://familycare-xxxx.vercel.app
```

Done! Open your Vercel URL, register, and log in.

---

## Updating the app later

- **Frontend:** `git push` → Vercel redeploys automatically.
- **Backend:** `git push`, then on the server:
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
| Site doesn't load at all | Check step 4 (Security List rules for 80/443) and that DuckDNS has the right IP. |
| Certificate step failed | DNS was not ready. Wait a minute, then `sudo certbot --nginx -d familycare.duckdns.org -m you@gmail.com --agree-tos --redirect` |
| Frontend shows network/CORS errors | `VITE_API_URL` on Vercel must be exactly `https://familycare.duckdns.org`, and step 8's URL must match your Vercel URL exactly. Redeploy Vercel after changing variables. |
| Refreshing a page on Vercel gives 404 | Make sure `vercel.json` is committed in the frontend repo. |
| Reminders at the wrong time | The script sets the server to `Asia/Kolkata`. Check with `timedatectl`. |
| Server IP changed | Update the IP on duckdns.org. |

## Local development still works as before

Nothing changed for running on your PC: the code falls back to `localhost`
when a setting is missing. `.env.example` files show every available setting.
