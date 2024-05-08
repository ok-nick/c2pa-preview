# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add right-click action to preview page for viewing JSON manifest in a separate window [#3](https://github.com/ok-nick/c2pa-preview/issues/3).

### Changed

- Change verify button to include URL if file is derived from online source.
- Change error overlay to native prompt.
- Change default search filter to image when selecting files.
- Update file drag & drop to support any source (e.g. from browser).
- Update c2pa web components to new interface.
- Migrate Tauri v1 to v2 [#5](https://github.com/ok-nick/c2pa-preview/issues/5).
- Migrate VanillaJS to React.

### Fixed

- Fix symlinked files not opening [#1](https://github.com/ok-nick/c2pa-preview/issues/1).
- Fix empty vertical space in UI on Linux and Windows [#2](https://github.com/ok-nick/c2pa-preview/issues/2).

## [0.1.0] - 2024-04-23

### Added

- Everything

[unreleased]: https://github.com/ok-nick/c2pa-preview/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ok-nick/c2pa-preview/commits/v0.1.0
