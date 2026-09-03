# Changelog

All notable changes to this project will be documented in this file.
## [0.1.1] - 2026-09-03

### Chore
- Remove account-api's own Keycloak, use local-dev-stack's shared instance (b54bb85)
## [0.1.0] - 2026-09-01

### Bug Fixes
- **auth,user,tenancy:** Address PR review comments (a0aecb1)
- **auth,user,tenancy:** Address latest PR review comments (206b62b)
- **user:** Align UserRegisteredEvent data with full user primitives (31c8d62)
- **core,auth,user,app,tenancy:** Resolve architecture/openspec convention audit findings (e0bbb7f)
- **build:** Add missing @support/* alias to tsconfig.build.json (aea6474)
- **auth,tenancy,user:** Address remaining PR review comments (feb5579)
- **auth:** Drop unused RegisterUserResult wrapper and command-level displayName validation (da6088e)
- **ci:** Pin packageManager in package.json to fix pnpm/action-setup (463f763)
- **ci,test:** Fix Integration/E2E CI jobs and align e2e-spec with actual API contract (6c8d7de)

### Chore
- Ignore agent worktree scratch space (493bade)
- **deps:** Update @sisques-labs/nestjs-kit to version 1.7.0 in package.json and pnpm-lock.yaml (9e9a9c1)
- **package:** Rename project to account-api and update metadata (b706878)
- **package:** Add repository and homepage fields to package.json (7d88ea9)
- Rename service from nestjs-template to account-api (4cb1e66)
- Reset package version to 0.0.0 (7b31f3e)
- Revert CHANGELOG.md to pre-v0.0.2 state (bd2501f)
- Empty CHANGELOG.md (ad9a01c)

### Documentation
- **architecture:** Document GraphQL transport-layer conventions (d241b8e)

### Features
- **identity,tenancy:** Add identity + tenancy contexts (Keycloak adapter, JWT/refresh, tenants, memberships) (5678bf9)
- **app:** Add update and delete methods to AppAggregate with corresponding events (22ecc33)
- **tenancy:** Implement update and delete methods in TenantAggregate and TenantMembershipAggregate (a312b5d)
- **api:** Implement versioning and update endpoints to v1 (9f8f29b)
- **app:** Make slug optional on create, generate from name when omitted (11b1723)
- **tenancy:** Add owner-only tenant update/delete, fix role enum regression (a0e45e0)
- **app,tenancy:** Add GraphQL transport layer for app and tenant management (26f233c)

### Refactor
- **identity:** Move ILoginSessionResult interface into login-user.handler.ts and remove redundant file (7adffaf)
- **tenancy:** Reorganize tenant and tenant membership aggregates into subdirectories and update imports accordingly (6989203)
- **app:** Extract App into its own bounded context (e1e5c38)
- **app:** Simplify IAppEventData by extending IAppPrimitives (af19a55)
- **app:** Update AppFindByIdQuery to use UuidValueObject for id (7c762f5)
- **app:** Simplify CreateAppCommand and its handler (e8ba60a)
- **app:** Streamline AppViewModel creation in AppTypeOrmMapper (141c800)
- **app:** Update AppsController tests to reflect changes in CreateAppCommand response (9aad6a9)
- **app:** Replace AppFindAllQuery with AppFindByCriteriaQuery and update related components (98d3e47)
- **app:** Update AppAggregate to use IBaseAggregate and streamline event metadata generation (9a5fbc7)
- **tenancy:** Update aggregates to extend IBaseAggregate and streamline event metadata generation (fe67ce5)
- **identity:** Split identity context into user and auth (e442a4f)
- **app:** Simplify CreateAppCommandInput type definition (1a1e733)
- **tenancy:** Reorganize builder imports and remove unused files (d2faf94)
- **tenancy:** Update query input types to use ITenantMembershipPrimitives (c0cc572)
- **tenancy:** Reorganize exception imports and remove obsolete files (bd68b31)
- **tenancy:** Enhance TenantRoleValueObject to use EnumValueObject (29381c4)
- **tenancy:** Update adapter import paths and remove obsolete adapter files (58352a8)
- **tenancy:** Simplify TenantMembershipTypeOrmMapper by using builder pattern (923f032)
- **tenancy:** Add toViewModel method in TenantTypeOrmMapper using builder pattern (2949232)
- **user:** Make displayName optional and simplify user registration event (f062121)
- **app:** Flatten single-entity GraphQL transport layout (3a07887)

