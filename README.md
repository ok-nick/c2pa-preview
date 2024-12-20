<div align="center">
  <h1><code>c2pa-preview</code></h1>
  <p>
    <a href="https://github.com/ok-nick/c2pa-preview/releases"><img src="https://img.shields.io/badge/-macOS-black?style=flat-square&logo=apple&log" alt="macOS" /></a>
    <a href="https://github.com/ok-nick/c2pa-preview/releases"><img src="https://img.shields.io/badge/-Windows-blue?style=flat-square&logo=windows&logoColor=white" alt="Windows" /></a>
    <a href="https://github.com/ok-nick/c2pa-preview/releases"><img src="https://img.shields.io/badge/-Linux-yellow?style=flat-square&logo=linux&logoColor=white" alt="Linux" /></a>
    <br>
    <a href="https://github.com/ok-nick/c2pa-preview/actions/workflows/check-backend.yml"><img src="https://github.com/ok-nick/c2pa-preview/actions/workflows/check-backend.yml/badge.svg" alt="backend" /></a>
    <a href="https://github.com/ok-nick/c2pa-preview/actions/workflows/check-frontend.yml"><img src="https://github.com/ok-nick/c2pa-preview/actions/workflows/check-frontend.yml/badge.svg" alt="frontend" /></a>
  </p>
</div>

`c2pa-preview` is a desktop application to display [content credentials](https://contentcredentials.org) for the [C2PA standard](https://c2pa.org) embedded within images, videos, and other types of files. 

<div align="center">
  <img src="./assets/screenshots/home.png" width="45%">
  <img src="./assets/screenshots/preview.png" width="45%">
  <img src="./assets/screenshots/preview-menu.png" width="45%">
  <img src="./assets/screenshots/editor.png" width="45%">
  <img src="./assets/screenshots/finder.png">
</div>

## Installation
### Installing from GitHub Releases
Pre-built binaries are available for macOS, Windows, and Linux from the [GitHub Releases page](https://github.com/ok-nick/c2pa-preview/releases).

### Installing from Source
Install the prerequisites from [Tauri docs](https://v2.tauri.app/start/prerequisites/) for your platform.

Then, install frontend packages (recommended [npm](https://www.npmjs.com)):
```bash
$ npm install --prefix frontend
```

Next, ensure [tauri-cli](https://crates.io/crates/tauri-cli) is installed and updated:
```bash
$ cargo install tauri-cli
```

Finally, build the app:
```bash
$ cargo tauri build
```

> [!IMPORTANT]
> Linux users may need to set `NO_STRIP=true` before executing the last step as described [here](https://github.com/tauri-apps/tauri/issues/8929).

## Example Images
Download or drag & drop an example image below to try it for yourself! For more examples, check out [this page](https://c2pa.org/public-testfiles/image/).

<div align="center">
    <img src="./assets/examples/example1.jpg" style="max-height: 230px;">
    <img src="./assets/examples/example3.jpg" style="max-height: 230px;">
    <img src="./assets/examples/example2.jpg" style="max-height: 230px;">
    <img src="./assets/examples/example4.jpg" style="max-height: 230px;">
</div>
