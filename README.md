# xinchao-dashboard

Dashboard frontend for Xinchao dynamic mind.

This is a tiny static v0.1 dashboard for reading Xinchao Dashboard Snapshot data. It does not store service tokens in the repository.

## What it shows

- consciousness and fatigue
- top drives
- all drive dimensions
- runtime window count
- enabled capabilities
- wake-style semantic interaction buttons
- automatic refresh every 8 seconds

## How to use

Open `index.html`, enter your Xinchao base URL and Dashboard access token, then connect.

Default base URL:

```text
https://xinchao.cheng128.com
```

For a hosted cross-origin page, Xinchao must allow the page origin through `DASHBOARD_ALLOWED_ORIGINS`, and the server must support Dashboard header sessions with:

```json
{"mode":"header"}
```

## Security note

Do not commit any of these values:

```text
SERVICE_TOKEN
DASHBOARD_ACCESS_TOKEN
BRIDGE_MACHINE_TOKEN
OAUTH_APPROVAL_TOKEN
```

The page asks for the Dashboard token at runtime only so it can exchange it for a short session token.
