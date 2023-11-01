# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Nothing yet!

## [0.4.6] - 2023-11-01

### Fixed

- Take `using` directive into account when adding import statement in file

## [0.4.5] - 2023-07-21

### Fixed

- Do not replace className if there is only a simple identifier mapping such as `className={className}`

## [0.4.4] - 2023-02-03

### Fixed

- Add missing svg tags as known JSX tags

## [0.4.3] - 2023-01-22

### Fixed

- Fix issue with className extraction when spread operator is used

## [0.4.2] - 2023-01-22

### Changed

- Improve performance by removing checks of code when user is moving cursor in the text editor

## [0.4.1] - 2023-01-21

### Changed

- Change extension logo background color from transparent to white

## [0.4.0] - 2023-01-21

### Added

- Add screenshot in README.md file
- Add extension logo

## [0.3.2] - 2023-01-21

### Fixed

- Add missing props to extracted components when expressions are used

[unreleased]: https://github.com/dimitribarbot/tailwind-styled-components-extractor/compare/v0.4.6...HEAD
[0.4.6]: https://github.com/dimitribarbot/tailwind-styled-components-extractor/compare/v0.4.5...v0.4.6
[0.4.5]: https://github.com/dimitribarbot/tailwind-styled-components-extractor/compare/v0.4.4...v0.4.5
[0.4.4]: https://github.com/dimitribarbot/tailwind-styled-components-extractor/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/dimitribarbot/tailwind-styled-components-extractor/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/dimitribarbot/tailwind-styled-components-extractor/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/dimitribarbot/tailwind-styled-components-extractor/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/dimitribarbot/tailwind-styled-components-extractor/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/dimitribarbot/tailwind-styled-components-extractor/compare/b72f621adfcd460d7f15241dea247ebaa074dbea...v0.3.2
