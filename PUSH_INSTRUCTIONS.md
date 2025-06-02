# How to Push Latest Changes to GitHub

You have 1 unpushed commit:
- `a5c8386c Add crypto.randomUUID polyfill for browser extension compatibility`

## Method 1: Using Personal Access Token (Recommended)

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name like "mychain-push"
4. Select the "repo" scope
5. Generate the token and copy it
6. Run this command (replace YOUR_TOKEN with your actual token):

```bash
cd /home/dk/go/src/myrollapps/mychain
git push https://YOUR_TOKEN@github.com/mfabdev/mychain.git main
```

## Method 2: Using SSH Key

1. Generate an SSH key:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. Copy the public key:
```bash
cat ~/.ssh/id_ed25519.pub
```

3. Add it to GitHub at https://github.com/settings/keys

4. Change the remote URL:
```bash
cd /home/dk/go/src/myrollapps/mychain
git remote set-url origin git@github.com:mfabdev/mychain.git
```

5. Push:
```bash
git push origin main
```

## Method 3: Using GitHub Desktop or Git GUI

If you prefer a graphical interface, you can use GitHub Desktop or any Git GUI client.

## Current Status

Your local repository is up-to-date with all fixes:
- ✅ PowerReduction fix (1 ALC minimum stake)
- ✅ Dashboard API port fix (1317)
- ✅ Chain ID fix (mychain)
- ✅ TestUSD amount fix (1,001)
- ✅ MainCoin page values fixed
- ✅ Validator address updated
- ✅ crypto.randomUUID polyfill added

Once you push, the AWS instance can be updated by SSH-ing in and running:
```bash
cd ~/mychain
git pull
cd web-dashboard
npm run build
sudo systemctl restart mychain-dashboard
```