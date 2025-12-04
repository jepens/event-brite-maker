# 🚀 Deployment Guide - Nixpacks (Easypanel)

## 📋 Permasalahan Sebelumnya

### Error dengan Buildpacks:
```
ERROR: failed to build: failed to fetch builder image 'index.docker.io/heroku/builder:24': 
Error response from daemon: client version 1.38 is too old. 
Minimum supported API version is 1.44, please upgrade your client to a newer version
```

**Root Cause**: Docker client di Easypanel terlalu lama (v1.38), tidak kompatibel dengan Heroku Builder 24 yang memerlukan minimal v1.44.

**Solusi**: Migrasi ke **Nixpacks** yang lebih modern dan tidak bergantung pada versi Docker tertentu.

---

## ✅ Langkah Deployment dengan Nixpacks

### 1️⃣ Update Configuration di Easypanel

Pada dashboard Easypanel:

1. **Navigate to**: `event_registration > Build`
2. **Pilih Build Method**: `Nixpacks` (radio button)
3. **Hapus/Kosongkan Builder field** (tidak diperlukan untuk Nixpacks)
4. **Klik "Save"**

### 2️⃣ File Konfigurasi yang Ditambahkan

#### `nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start"

[variables]
NODE_ENV = "production"
```

**Penjelasan**:
- **nodejs_20**: Menggunakan Node.js versi 20 (LTS)
- **npm ci**: Install dependencies dengan clean install (production-ready)
- **npm run build**: Build Vite application
- **npm run start**: Jalankan Vite preview server di production

#### `.nixpacksignore`
File ini mencegah testing scripts dan development files ter-upload ke production:
- Semua file `test-*.js`, `debug-*.js`, `check-*.js`
- File CSV testing
- `bun.lockb` (tidak diperlukan karena menggunakan npm)

### 3️⃣ Environment Variables

Pastikan environment variables sudah ter-set di Easypanel:

```bash
VITE_SUPABASE_URL=https://mjolfjoqfnszvvlbzhjn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NODE_ENV=production
```

✅ **Sudah auto-inject oleh Easypanel** (terlihat di error log Anda)

### 4️⃣ Deploy!

1. **Push code ke GitHub**:
```bash
git add .
git commit -m "feat: Migrate to Nixpacks for deployment"
git push origin main
```

2. **Trigger Deploy di Easypanel**:
   - Klik tombol **"Deploy"** di dashboard
   - Easypanel akan otomatis pull dari GitHub dan build dengan Nixpacks

---

## 🔍 Mengapa Nixpacks?

| Aspek | Buildpacks (Heroku) | **Nixpacks** ✅ |
|-------|---------------------|----------------|
| **Dependencies** | Butuh Docker versi terbaru | Tidak bergantung Docker version |
| **Auto-detection** | Good | Excellent |
| **Vite Support** | Manual config needed | Built-in |
| **Build Speed** | Slower | **Faster** |
| **Maintenance** | Legacy (Heroku) | **Actively developed** (Railway) |

---

## 🎯 Verification Checklist

Setelah deploy berhasil, pastikan:

- [ ] Build berhasil tanpa error
- [ ] Application dapat diakses di URL Easypanel
- [ ] Supabase connection working (test login/data loading)
- [ ] Environment variables ter-load dengan benar
- [ ] Static assets (images, fonts) ter-serve dengan baik

---

## 🆘 Troubleshooting

### Build Gagal: "Cannot find module 'vite'"
**Solusi**: Pastikan `vite` ada di `dependencies`, bukan `devDependencies`

### Error: "ENOENT: no such file or directory, open 'dist/index.html'"
**Solusi**: Pastikan `npm run build` berhasil membuat folder `dist/`

### Application crash saat start
**Solusi**: 
1. Check logs di Easypanel dashboard
2. Pastikan port binding menggunakan environment variable `$PORT`
3. Verify `package.json` script `start` sudah benar

---

## 📚 Resources

- [Nixpacks Documentation](https://nixpacks.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/build.html)
- [Easypanel Docs](https://easypanel.io/docs)

---

**Status**: ✅ Ready to Deploy
**Last Updated**: December 5, 2025
**Author**: AI Assistant (Antigravity)
