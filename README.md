# DM-Assistant

## Setup guide
1. Login to the workspace and create a new app at: https://api.slack.com/apps?new_app=1
2. Add scopes (images of the required scopes are in the repository).
3. Create a .env file with the slack bot token and slack signing secret.
4. Host the javascript file and add the URL to the event subscriptions request url.
5. Add the slash commands "/enable", "/disable", "/info" with the same URL.
6. Add the app to the desired channel.

## Issues/Improvements
* Add tagging to the SRE names and Salesforce case. (Most likely requires Salesforce API access)
* Allow users to acknowledge cases.
* 'open dispatch from AU-Sydney' is currently not working on the support-bot side. However 'first response from AU-Sydney' works fine. Possible bug?
