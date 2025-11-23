# Setting Up AgentLens on GitHub

This guide will help you push AgentLens to GitHub while keeping your environment variables safe.

## ✅ What's Already Done

1. **`.gitignore`** - Created to exclude:
   - All `.env` files (your API keys are safe!)
   - `node_modules/`
   - `__pycache__/`
   - `.next/` (Next.js build files)
   - IDE files, OS files, and other temporary files

2. **`backend/env.example`** - Template file showing what environment variables are needed (without actual keys)

3. **Documentation** - README.md, LICENSE, and CONTRIBUTING.md are ready

## 🚀 Steps to Push to GitHub

### 1. Verify Your Environment Variables Are Safe

Check that your `.env` file is ignored:
```bash
cd /Users/sanjayanasuri/AgentLens
git check-ignore backend/.env
```
If it outputs `backend/.env`, you're good! ✅

### 2. Review What Will Be Committed

```bash
git status
```

You should see:
- ✅ All source code files
- ✅ Configuration files (package.json, requirements.txt, etc.)
- ✅ Documentation (README.md, LICENSE, etc.)
- ✅ Template files (backend/env.example)
- ❌ NO `.env` files (they're ignored)

### 3. Stage All Files

```bash
git add .
```

### 4. Create Your First Commit

```bash
git commit -m "Initial commit: AgentLens - LangGraph visualization and debugging tool"
```

### 5. Create a GitHub Repository

1. Go to https://github.com/new
2. Repository name: `AgentLens` (or your preferred name)
3. Description: "Visualize, debug, and understand LangGraph agent runs in real time"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 6. Connect and Push

GitHub will show you commands. Use these:

```bash
# Add the remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/AgentLens.git

# Rename branch to main if needed
git branch -M main

# Push to GitHub
git push -u origin main
```

### 7. Verify on GitHub

1. Go to your repository on GitHub
2. Check that:
   - ✅ All files are there
   - ❌ NO `.env` files are visible
   - ✅ `backend/env.example` exists as a template

## 🔒 Security Checklist

Before pushing, verify:

- [ ] `backend/.env` is NOT in the repository
- [ ] `frontend/.env` is NOT in the repository (if you have one)
- [ ] No API keys are hardcoded in source files
- [ ] `backend/env.example` exists as a template
- [ ] `.gitignore` includes all `.env` patterns

## 📝 For Contributors

Anyone cloning your repository should:

1. Clone the repo
2. Copy the template: `cp backend/env.example backend/.env`
3. Add their own API keys to `backend/.env`
4. The `.env` file will remain local and never be committed

## 🎉 You're Done!

Your repository is now safely on GitHub with:
- ✅ All source code
- ✅ Complete documentation
- ✅ Environment variable templates
- ✅ Proper `.gitignore` protection
- ❌ No sensitive API keys exposed

## 🔄 Future Updates

When you make changes:

```bash
git add .
git commit -m "Description of your changes"
git push
```

Your `.env` files will always be ignored automatically thanks to `.gitignore`.

---

**Remember**: Never commit `.env` files or API keys. The `.gitignore` file protects you, but always double-check before pushing sensitive information.

