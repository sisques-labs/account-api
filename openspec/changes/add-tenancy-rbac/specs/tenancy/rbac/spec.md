## Purpose

Restricts tenant-scoped actions (view, update, delete, manage members) to callers whose role within that specific tenant grants the required permission, replacing the current "any authenticated user" access model.

## ADDED Requirements

### Requirement: Tenant permission model
The system SHALL define a fixed set of tenant-level permissions (at minimum: view a tenant, manage a tenant's editable fields, delete a tenant, manage a tenant's members) and a mapping from each `TenantRole` (`OWNER`, `ADMIN`, `MEMBER`) to the permissions it grants. `OWNER` SHALL hold every permission. `MEMBER` SHALL hold only the view permission.

#### Scenario: Owner has full permissions
- **GIVEN** a user is a member of a tenant with role `OWNER`
- **WHEN** the system checks whether that role grants any tenant permission (view, manage, delete, manage members)
- **THEN** the check succeeds for all of them

#### Scenario: Member is limited to view
- **GIVEN** a user is a member of a tenant with role `MEMBER`
- **WHEN** the system checks whether that role grants the manage, delete, or manage-members permission
- **THEN** the check fails for each of them
- **AND** the check succeeds for the view permission

### Requirement: Tenant update requires manage permission
The system SHALL reject a request to update a tenant's editable fields (name, slug) unless the caller has an active membership in that tenant whose role grants the manage-tenant permission.

#### Scenario: Admin updates a tenant
- **GIVEN** the caller is a member of the target tenant with a role that grants manage-tenant
- **WHEN** the caller requests an update to that tenant's name or slug
- **THEN** the update SHALL succeed

#### Scenario: Member without manage permission is rejected
- **GIVEN** the caller is a member of the target tenant with role `MEMBER`
- **WHEN** the caller requests an update to that tenant
- **THEN** the system SHALL reject the request with a forbidden error
- **AND** the tenant SHALL remain unchanged

### Requirement: Tenant deletion requires delete permission
The system SHALL reject a request to delete a tenant unless the caller has an active membership in that tenant whose role grants the delete-tenant permission.

#### Scenario: Owner deletes a tenant
- **GIVEN** the caller is a member of the target tenant with role `OWNER`
- **WHEN** the caller requests deletion of that tenant
- **THEN** the deletion SHALL succeed

#### Scenario: Admin without delete permission is rejected
- **GIVEN** the caller is a member of the target tenant with role `ADMIN`, and `ADMIN` does not grant delete-tenant
- **WHEN** the caller requests deletion of that tenant
- **THEN** the system SHALL reject the request with a forbidden error
- **AND** the tenant SHALL remain undeleted

### Requirement: Member management requires manage-members permission
The system SHALL reject a request to add a member to a tenant unless the caller has an active membership in that tenant whose role grants the manage-members permission.

#### Scenario: Owner adds a member
- **GIVEN** the caller is a member of the target tenant with a role that grants manage-members
- **WHEN** the caller requests to add another user as a member of that tenant
- **THEN** the member SHALL be added

#### Scenario: Member cannot add another member
- **GIVEN** the caller is a member of the target tenant with role `MEMBER`
- **WHEN** the caller requests to add another user as a member of that tenant
- **THEN** the system SHALL reject the request with a forbidden error
- **AND** no member SHALL be added

### Requirement: Listing a tenant's members requires view permission
The system SHALL reject a request to list a tenant's members unless the caller has an active membership in that tenant whose role grants the view-tenant permission.

#### Scenario: Member views the member list
- **GIVEN** the caller is a member of the target tenant with role `MEMBER`
- **WHEN** the caller requests the list of that tenant's members
- **THEN** the list SHALL be returned

#### Scenario: Non-member is rejected
- **GIVEN** the caller is authenticated but has no membership in the target tenant
- **WHEN** the caller requests the list of that tenant's members
- **THEN** the system SHALL reject the request with a forbidden error

### Requirement: Non-members are denied tenant access
The system SHALL reject a request scoped to a specific tenant (view, update, delete, manage members) when the authenticated caller has no membership record for that tenant, regardless of the caller's role in any other tenant.

#### Scenario: Authenticated non-member is rejected
- **GIVEN** the caller is authenticated but has no membership in the target tenant
- **WHEN** the caller requests an action scoped to that tenant
- **THEN** the system SHALL reject the request with a forbidden error

#### Scenario: Member of a different tenant is rejected
- **GIVEN** the caller is an `OWNER` of tenant A but has no membership in tenant B
- **WHEN** the caller requests a manage-permission action scoped to tenant B
- **THEN** the system SHALL reject the request with a forbidden error
