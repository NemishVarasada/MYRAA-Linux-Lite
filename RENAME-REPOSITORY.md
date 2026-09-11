# Rename the GitHub repository

After the product branch is reviewed and merged, run this command from the repository folder:

```bash
gh repo rename Vaani-Linux
```

Verify the new location:

```bash
gh repo view Nemish-Vaani/Vaani-Linux --json nameWithOwner,isPrivate,url
```

Update any local clone that does not follow GitHub's redirect:

```bash
git remote set-url origin https://github.com/Nemish-Vaani/Vaani-Linux.git
```

Keep real provider keys, local settings, memories, logs, model files, build outputs, and virtual environments out of Git.
