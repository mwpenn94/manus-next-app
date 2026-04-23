# Azure AD App Registration - Complete

## App Details
- **Name:** Sovereign AI Office Connector
- **Client ID:** f754cd6c-7e23-4c2d-b41c-d44debbc0ea9
- **Supported accounts:** Any Entra ID Tenant + Personal Microsoft accounts
- **Redirect URI:** https://manusnext-mlromfub.manus.space/api/connector/oauth/callback

## Configured Permissions (Microsoft Graph - 6 total)
All delegated, no admin consent required:

| Permission | Type | Description |
|---|---|---|
| Calendars.ReadWrite | Delegated | Have full access to user calendars |
| Files.ReadWrite | Delegated | Have full access to user files |
| Mail.Read | Delegated | Read user mail |
| Mail.ReadWrite | Delegated | Read and write access to user mail |
| Mail.Send | Delegated | Send mail as a user |
| User.Read | Delegated | Sign in and read user profile |

## Status
- Client ID: Set via webdev_request_secrets
- Client Secret: Set via webdev_request_secrets
- All 6 permissions configured in Azure Portal
- Credentials file deleted from project for security
- Connector code requests scopes dynamically during OAuth flow
