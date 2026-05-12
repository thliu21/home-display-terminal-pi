# Raspberry Pi Dedicated SSH Key

This project deploys to Raspberry Pi over SSH. For a personal Pi, avoid pasting
the account password into chat or terminal prompts repeatedly. Use a dedicated
SSH key for that Pi instead.

## Why

Password SSH works, but it is awkward and easy to leak. A dedicated SSH key lets
this Mac prove its identity to the Pi without storing or sending the Pi password.

The private key stays on the Mac. Only the public key is copied to the Pi.

## Current Pi

The current Raspberry Pi 5 is:

```bash
tliu@homepi5.local
```

The local SSH alias is:

```bash
homepi5
```

The dedicated key files are:

```bash
~/.ssh/motorhome_homepi5
~/.ssh/motorhome_homepi5.pub
```

## Create a Dedicated Key

Use a dedicated filename so this Pi does not share the default `id_ed25519`
identity:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/motorhome_homepi5 -C "motorhome-homepi5"
```

You can choose a passphrase when prompted. For unattended deploys, leaving it
empty is more convenient; using a passphrase is more secure.

## Install the Public Key on the Pi

Install exactly this public key:

```bash
ssh-copy-id -i ~/.ssh/motorhome_homepi5.pub tliu@homepi5.local
```

This asks for the Pi password once. It appends the public key to:

```bash
/home/tliu/.ssh/authorized_keys
```

## Configure SSH

Add this to `~/.ssh/config`:

```sshconfig
Host homepi5 homepi5.local
  HostName homepi5.local
  User tliu
  IdentityFile ~/.ssh/motorhome_homepi5
  IdentitiesOnly yes
```

The `Host homepi5 homepi5.local` line matters. It makes both of these forms use
the same dedicated key:

```bash
ssh homepi5
ssh tliu@homepi5.local
```

## Verify Passwordless Login

Use `BatchMode=yes` to prove SSH is not silently falling back to a password:

```bash
ssh -o BatchMode=yes homepi5 'whoami && hostname'
ssh -o BatchMode=yes tliu@homepi5.local 'whoami && hostname'
```

Both commands should print:

```text
tliu
homepi5
```

If either command asks for a password or fails, check that `~/.ssh/config`
matches the key path and that the public key was installed with `ssh-copy-id`.

## Deploy

After the key is installed and verified, deploy without typing a password:

```bash
PI_HOST=homepi5 ./scripts/deploy-restart.sh
```

The longer host form also works:

```bash
PI_HOST=tliu@homepi5.local ./scripts/deploy-restart.sh
```
