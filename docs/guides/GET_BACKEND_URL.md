## 🔍 How to Get Your Backend URL from Render.com

### Step-by-Step Guide:

#### 1. Open Render.com Dashboard
Visit: https://dashboard.render.com

#### 2. Check Service Status

You should see one of these scenarios:

**Scenario A: Service Already Created**
- Look for a service named **"notehub-backend"**
- Status should show "Live" (green) when ready
- Click on it to view details

**Scenario B: No Service Yet**
- You need to create the service first
- See instructions below

---

## 📝 If Service Already Exists (Scenario A):

1. **Click on "notehub-backend" service**
   - You'll see the service details page

2. **Find the URL at the top**
   - Look for a URL like: `https://notehub-backend-XXXX.onrender.com`
   - It's displayed prominently near the service name
   - Copy this entire URL

3. **Check Deployment Status**
   - If status is "Building" - wait 2-5 minutes
   - If status is "Live" (green) - ✅ Ready to use!
   - If status is "Failed" - check build logs

---

## 🚀 If No Service Yet (Scenario B):

### Create the Service:

1. **Click "New +" button** (top right)

2. **Select "Web Service"**

3. **Connect GitHub Repository**
   - Search for: `thienng-it/note-hub`
   - Click "Connect"

4. **Configure Service**
   Render should auto-detect `render.yaml` and fill in:
   - **Name:** notehub-backend
   - **Region:** Oregon
   - **Branch:** main
   - **Root Directory:** backend
   - **Build Command:** npm install
   - **Start Command:** npm start
   - **Plan:** Free

5. **Click "Create Web Service"**

6. **Wait for Deployment** (2-5 minutes)
   - Watch the build logs
   - Wait for "Live" status

7. **Copy the URL**
   - Once live, you'll see: `https://notehub-backend-XXXX.onrender.com`
   - Copy this URL

---

## 📋 Quick Check Commands:

After getting the URL, test if backend is working:

```bash
# Replace with your actual URL
curl https://notehub-backend-XXXX.onrender.com/api/v1/health

# Should return something like:
# {"status":"ok","database":"connected"}
```

---

## ⚠️ Common Issues:

### "Build Failed"
- Check build logs in Render dashboard
- Common fix: Check render.yaml configuration

### "Service Not Found"
- Make sure you pushed render.yaml to GitHub
- Refresh the Render dashboard

### "Deployment Taking Too Long"
- First deployment can take 5-10 minutes
- Be patient, check build logs for progress

---

## 🎯 Next Steps:

Once you have the URL (looks like `https://notehub-backend-XXXX.onrender.com`):

1. Run the deployment helper:
   ```bash
   ./scripts/finish-deployment.sh
   ```

2. Paste your backend URL when prompted

3. Script will automatically:
   - Update frontend configuration
   - Build frontend
   - Deploy to Firebase
   - Show your live URLs

---

## 📞 Need Help?

If you're stuck:
1. Tell me what you see in the Render dashboard
2. Share any error messages
3. I'll help you troubleshoot!

**Dashboard Link:** https://dashboard.render.com
