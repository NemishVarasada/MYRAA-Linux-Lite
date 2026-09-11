# Rename the GitHub repository

The connected GitHub token is currently read-only, so repository renaming must be confirmed by the owner.

From this repository folder, run:

```bash
gh repo rename Vaani-Linux
```

Confirm when GitHub asks. Then verify:

```bash
gh repo view NemishVarasada/Vaani-Linux --json nameWithOwner,isPrivate,url
```

After development, keep the repository private and authorize only the repositories that need automation access.
