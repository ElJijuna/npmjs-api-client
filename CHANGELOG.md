# [1.8.0](https://github.com/ElJijuna/npmjs-api-client/compare/v1.7.0...v1.8.0) (2026-05-13)


### Bug Fixes

* prevent empty text query param ([0d128db](https://github.com/ElJijuna/npmjs-api-client/commit/0d128db48799fb99a39faeb5b1d2091b339fb335))


### Features

* add authenticated user resource ([3e5b320](https://github.com/ElJijuna/npmjs-api-client/commit/3e5b3205d910ea3b9a600a9caf98fc6d784d9ac2))

# [1.7.0](https://github.com/ElJijuna/npmjs-api-client/compare/v1.6.0...v1.7.0) (2026-05-08)


### Features

* add authenticated org resource. ([5b068c0](https://github.com/ElJijuna/npmjs-api-client/commit/5b068c07deef7563003da2e5972446cac4463009))
* add maintainer avatar URL from gravatar. ([327dca9](https://github.com/ElJijuna/npmjs-api-client/commit/327dca910b16e62ed81bd9e6ade8c024f269802a))
* add top package search helpers ([b97499d](https://github.com/ElJijuna/npmjs-api-client/commit/b97499d73d315a2329e8e9bc83cd644f2b0b5d86))

# [1.6.0](https://github.com/ElJijuna/npmjs-api-client/compare/v1.5.0...v1.6.0) (2026-05-06)


### Features

* add avatar() to MaintainerResource. ([d7a1c61](https://github.com/ElJijuna/npmjs-api-client/commit/d7a1c61e6cf167ac00885e8eafd94a8cd02c7029))
* add bulkDownloads() to fetch download counts for multiple packages in one request ([21b83ed](https://github.com/ElJijuna/npmjs-api-client/commit/21b83ed190ddcda023fbc2dd6a0682d69d882e2a))
* add security audit support (audit, auditQuick) ([a51758f](https://github.com/ElJijuna/npmjs-api-client/commit/a51758f96ec50d1b67de6f99f472fc055ce50f62))

# [1.5.0](https://github.com/ElJijuna/npmjs-api-client/compare/v1.4.0...v1.5.0) (2026-05-06)


### Features

* update NpmClient with apis defined and add implementations to use this. ([54cbbac](https://github.com/ElJijuna/npmjs-api-client/commit/54cbbac11d7381476c8408b9a872feb501ce8a52))
* update PackageResources with package score, size and cdnStats. ([c1d501a](https://github.com/ElJijuna/npmjs-api-client/commit/c1d501a74febb427b729ada9b9978fd027562d0e))
* update VersionResource with size, files, cdnStats and dependencies. ([e86894e](https://github.com/ElJijuna/npmjs-api-client/commit/e86894ed4d604969ecd9542a416e3e4bc80d33ef))

# [1.4.0](https://github.com/ElJijuna/npmjs-api-client/compare/v1.3.0...v1.4.0) (2026-05-04)


### Features

* add version-level download stats ([5952f9b](https://github.com/ElJijuna/npmjs-api-client/commit/5952f9be336860a4b36b52ac0dab1d6a793315a4)), closes [#5](https://github.com/ElJijuna/npmjs-api-client/issues/5)

# [1.3.0](https://github.com/ElJijuna/npmjs-api-client/compare/v1.2.0...v1.3.0) (2026-04-16)


### Features

* add AbortSignal support to all request methods [#3](https://github.com/ElJijuna/npmjs-api-client/issues/3) ([74903be](https://github.com/ElJijuna/npmjs-api-client/commit/74903be73e0b144df9497c01aeb75b911b96c755))

# [1.2.0](https://github.com/ElJijuna/npmjs-api-client/compare/v1.1.0...v1.2.0) (2026-04-13)


### Bug Fixes

* disable semantic-release issue comments ([59e4ebf](https://github.com/ElJijuna/npmjs-api-client/commit/59e4ebf404344471918429676a496d711dfa25bb))


### Features

* add user/maintaner info. ([fa88411](https://github.com/ElJijuna/npmjs-api-client/commit/fa88411c18cb0910ffd9800001578e2c1e0a18c9))

# 1.0.0 (2026-04-13)


### Features

* add implementation base in template api client to get package info, version, versions, maintainers, tags, stats, and search result, all from public api. ([9d25ce1](https://github.com/ElJijuna/npmjs-api-client/commit/9d25ce14a40301a1812e74d628d66b036a62317f))
