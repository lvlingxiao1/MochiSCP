# 🍡 MochiSCP (麻糬SCP)

<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" alt="MochiSCP Icon" width="128" />
  <br />
  <strong>The sweetest, lightweight dual-pane SFTP/SCP client for macOS & beyond.</strong>
  <br />
  <sub>Inspired by classic WinSCP, redesigned with warm pastel pink aesthetics, ultra-fast native performance, and seamless external editor auto-sync.</sub>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-preview">Preview</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-shortcuts">Shortcuts</a> •
  <a href="#-license">License</a>
</p>

---

## 📸 Preview

![MochiSCP Workspace](docs/screenshots/mochiscp_main.png)

---

## ✨ Features

- 🌸 **Warm & Sweet Aesthetic**: Delightful pastel pink ("Sakura Rose") theme, soft frosted glassmorphism, and clear high-contrast typography.
- ⚡ **Ultra-Lightweight & Blazing Fast**: Built with **Tauri 2 + Rust + React 19**, with a standalone app bundle size of only ~**12 MB** (installer DMG ~4.5 MB), compared to ~150–200 MB for typical Electron-based tools.
- 🔄 **Classic Dual-Pane Interface**: Classical Norton Commander / WinSCP dual-pane layout (Local filesystem on the left, Remote SFTP on the right).
- 🖱️ **Smooth Drag & Drop**: Native drag-and-drop between panes for instant uploads and downloads.
- 📝 **Remote File Edit & Auto-Sync**: Double-click or press `F4` to edit remote files directly in your favorite editor (VS Code, Cursor, Zed, TextEdit); edits auto-sync back to the server upon save!
- 🔐 **Secure Credential Storage**: Apple Keychain / OS Secret Service integration for safe password and passphrase storage.
- 💻 **Integrated Terminal Launcher**: Launch native macOS Terminal or iTerm2 directly into the current remote directory with one click.
- 🔗 **Symlink & Permissions Management**: Full symlink path resolution, recursive directory traversal, and chmod permission matrix modal.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) & [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/) (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)

### Development
```bash
# Install dependencies
pnpm install

# Start local dev mode with hot reload
pnpm tauri dev
```

### Production Build
```bash
# Build native release DMG & App bundle
pnpm tauri build
```
Built artifacts will be placed in:
- **macOS App**: `src-tauri/target/release/bundle/macos/MochiSCP.app` (~12 MB)
- **DMG Installer**: `src-tauri/target/release/bundle/dmg/MochiSCP_0.1.0_aarch64.dmg` (~4.5 MB)

---

## ⌨️ Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Enter` | Open folder / edit remote file |
| `F5` | Upload / Download selected items |
| `F7` | Create new folder |
| `F8` / `Cmd + Backspace` | Delete selected items |
| `Cmd + A` | Select all files in pane |
| `F12` / `Cmd + Opt + I` | Open DevTools & Web Inspector |

---

## 📄 License
MIT License
