# Owner Console Overview

The Owner Console is a restricted area of the Venzory platform designed for the platform owner to inspect practices and members in a safe, read-only manner.

## Access Control

Access is strictly limited to the platform owner, identified by the `PLATFORM_OWNER_EMAIL` environment variable.

- **Authentication**: User must be logged in.
- **Authorization**: User's email must match `PLATFORM_OWNER_EMAIL`.
- **Enforcement**:
  - **Middleware**: Blocks access to `/owner/*` routes for non-owners.
  - **Service Layer**: `OwnerService` methods explicitly check `isPlatformOwner()` before returning data.

## Features (V1)

### Practice List
- Lists all practices on the platform.
- Shows: Name, Slug, Created Date, Status (Active/Onboarding), User Count.
- Allows navigation to practice details.

### Practice Details
- Shows practice name and slug.
- Lists all members of the practice.
- Member details: User Name, Email, Role, Status.

## Configuration

To enable the Owner Console, set the following environment variable:

```bash
PLATFORM_OWNER_EMAIL=your-email@example.com
```

If this variable is not set, or if your email does not match, you will not see the "Owner Console" link in the sidebar and will be denied access to the routes.

## Future Improvements

- Usage metrics (orders per month, etc.).
- Subscription management.
- Ability to suspend/activate practices.
- Impersonation (log in as practice admin) - *Requires careful security auditing*.

