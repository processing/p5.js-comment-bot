# p5-bot App

This app handles webhook requests sent from GitHub and perform related actions accordingly.

## Deployment
The app is deployed as a Cloudflare Worker and requires setting the following secret values:
- `APP_ID`
- `WEBHOOK_SECRET`
- `PRIVATE_KEY`
