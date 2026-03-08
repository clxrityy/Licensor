# Changelog

## [0.2.0](https://github.com/clxrityy/Licensor/compare/licensor-v0.1.0...licensor-v0.2.0) (2026-03-08)


### Features

* add tailwind ([8242164](https://github.com/clxrityy/Licensor/commit/8242164326423607db11777d349960b0f4d98cc3))
* **app:** integrate update management ([e77cefa](https://github.com/clxrityy/Licensor/commit/e77cefa6819444ea78aaab9e2e4886bfe9bb47c6))
* **app:** react router ([f39694b](https://github.com/clxrityy/Licensor/commit/f39694b829e3946d9fb2caa1fb49e73a664805d3))
* **capabilities:** add fs:allow-home-write-recursive ([52f282c](https://github.com/clxrityy/Licensor/commit/52f282c903e05f1132a9d1319aca8e1ed40b69b2))
* **capabilities:** add sql:allow-execute permission to default.json ([d3b0b2b](https://github.com/clxrityy/Licensor/commit/d3b0b2b0810fbc585ad2d0b16bcbc8193d6c9c54))
* **ci:** add CI workflow ([f4bed1b](https://github.com/clxrityy/Licensor/commit/f4bed1b1236e49327f1a381ca16a00a363552874))
* **ci:** implement matrix strategy for multi-platform builds ([7922c1b](https://github.com/clxrityy/Licensor/commit/7922c1b3c38d52f4f6788ccbfe36ceba0136d2cd))
* **components:** add FolderTree and Sidebar components with folder navigation ([a9607c5](https://github.com/clxrityy/Licensor/commit/a9607c52cb0a93b87cf64a7b21e66b39a5660ff0))
* **db:** enhance parseFrontmatter ([66b3e49](https://github.com/clxrityy/Licensor/commit/66b3e4949e9d716cf05f971c7d6071694297fa34))
* **db:** implement SQLite database connection and migration logic ([a67608e](https://github.com/clxrityy/Licensor/commit/a67608e62419d466a88c1c463f8529939bc87534))
* **db:** improve database initialization and connection handling ([718de35](https://github.com/clxrityy/Licensor/commit/718de35c5d3c1936ed7e2a38d7c36cb0873d1cd7))
* **dependencies:** add @tauri-apps/plugin-process ([d62d363](https://github.com/clxrityy/Licensor/commit/d62d3632d43169e732817f500a55928efecb2f75))
* **dependencies:** add regex ([f35014e](https://github.com/clxrityy/Licensor/commit/f35014ea2d6ec2355b16c5fa736f288105f5ab84))
* **dependencies:** add tauri-plugin-process to Cargo ([c7e06b0](https://github.com/clxrityy/Licensor/commit/c7e06b0b09c57e6a47d499dfad78266e81684322))
* **dependencies:** add tauri-plugin-updater and update related configurations ([06958f7](https://github.com/clxrityy/Licensor/commit/06958f7989959b55bb6f708336c1f3e8a5e45491))
* **deps:** add icon library ([9177c38](https://github.com/clxrityy/Licensor/commit/9177c38c712a5de8bba7802d5d3efbce5ee40c03))
* **docs:** update README with examples and new images ([fd55c37](https://github.com/clxrityy/Licensor/commit/fd55c37d6546548afa2c1ffd45c62a64cb51f2be))
* **hooks:** explicit return type ([289e956](https://github.com/clxrityy/Licensor/commit/289e95655a5f94c28476ed584f0a37c075694989))
* **icons:** update and add icon files ([f210806](https://github.com/clxrityy/Licensor/commit/f210806300148e408d5fcc79af5d087ef4472d8c))
* **preview:** enhance markdown variable/format rendering ([f40c48c](https://github.com/clxrityy/Licensor/commit/f40c48c708d3250a14a1a269a1d2bead0623d216))
* **preview:** implement markdown rendering for in-app preview ([3e8d741](https://github.com/clxrityy/Licensor/commit/3e8d741e1969d65d9982c1c45b80ec7ad5e284b7))
* **release:** add release-please configuration files ([2ace6d3](https://github.com/clxrityy/Licensor/commit/2ace6d31628444abc1020a560b3c22770297b75c))
* **seed:** implement loading of bundled templates and seeding into database ([ca9e778](https://github.com/clxrityy/Licensor/commit/ca9e778dd5f842c9b3014a096ba4f759236fc987))
* **tauri:** add updater plugin configuration with endpoints and public key ([d255ef9](https://github.com/clxrityy/Licensor/commit/d255ef969464af7facd07c961efbc59025b53a15))
* **tauri:** update window dimensions 1000x800 ([ab49ff2](https://github.com/clxrityy/Licensor/commit/ab49ff27416ee51e44eeaaf432c619ce800a18df))
* **template:** add example template demonstrating variable usage ([3486f4d](https://github.com/clxrityy/Licensor/commit/3486f4d41ca97de0a2aa61a9994686e44f6fe789))
* **ui:** add button styling for improved user interaction ([8ac06c7](https://github.com/clxrityy/Licensor/commit/8ac06c7ea7dde2c8eab8dcd041ba471f319a3439))
* **ui:** add Tooltip component ([769107f](https://github.com/clxrityy/Licensor/commit/769107fc2689e4efc788e62a3152c5ec04e5f5ef))
* **ui:** add VariablePills component for displaying variable names with toggle ([5ff13e4](https://github.com/clxrityy/Licensor/commit/5ff13e4edd063ec9046481ef1291c3c9880809f3))
* **ui:** enhance TemplateList style ([049afee](https://github.com/clxrityy/Licensor/commit/049afee3d94da86b11a67d0e130ffcad4d8686d8))
* **ui:** export components ([c2ece36](https://github.com/clxrityy/Licensor/commit/c2ece364de696c7af8a6d2f3dcfa3e15f61b0587))
* **updater:** enhance update management with type safety and improved error handling ([54a4324](https://github.com/clxrityy/Licensor/commit/54a43240c4496753833b1b8cfed077fd0803f374))
* **updater:** implement update management hook and banner component ([ba9c876](https://github.com/clxrityy/Licensor/commit/ba9c87636511d4bddf995593a83df23d96ac1554))
* **workspace:** add packages section for project structure ([2c30d53](https://github.com/clxrityy/Licensor/commit/2c30d53a4424da009efd6b3ca15280d4d55e5bb3))


### Bug Fixes

* **ci:** replace rust setup action with stable toolchain ([b03d7d5](https://github.com/clxrityy/Licensor/commit/b03d7d5ba51115c513a6a52f8db1d597b42bd59f))
* correct release-please config ([a14dca9](https://github.com/clxrityy/Licensor/commit/a14dca989d08b7a65f4410948b30d4c3410fa5d8))
* **db:** update database path to match frontend configuration ([73588e1](https://github.com/clxrityy/Licensor/commit/73588e17c6773786a6f14a8f5096150826ceb296))
* **docs:** update image sizes in README for better visibility ([70a4916](https://github.com/clxrityy/Licensor/commit/70a4916c298048a9c08df55dec9ab9627b79d20e))
* **html:** update document title to match application name ([67f85b2](https://github.com/clxrityy/Licensor/commit/67f85b2475be898a2dde6921a4747068bc3a19ab))
* **plan:** capabilities in default.json ([027abb4](https://github.com/clxrityy/Licensor/commit/027abb4578c4f6d13ef82818b79ed5ed7bd86c15))
* **readme:** update app description ([5c10bed](https://github.com/clxrityy/Licensor/commit/5c10bedb7f527a235e1ef01e0e9b3e9aea425505))
* **tauri:** set content security policy in configuration ([1c86bd3](https://github.com/clxrityy/Licensor/commit/1c86bd3fb266e47f800a0cdd3656e05945d5a87a))
