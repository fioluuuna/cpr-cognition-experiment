# CPR Cognition Experiment

Mobile web prototype for the emergency-aid research idea.

## What it does

- Runs in iPhone Safari or any mobile browser
- Supports 4 explanation conditions:
  - Control
  - Direct
  - Concise
  - Full
- Supports 3 pressure / scenario variants
- Logs:
  - reaction time
  - choice
  - timeouts
  - confidence
  - perceived load
  - post-task questionnaire
- Exports JSON locally and can POST the session to the server for archiving

## How to run

```powershell
node server.mjs
```

Then open the printed URL on your phone browser.

## How to use on iPhone

1. Connect the iPhone and the computer to the same Wi-Fi.
2. Open the site in Safari with the computer IP address.
3. Optionally tap Share -> Add to Home Screen.

## Suggested experiment flow

1. Enter participant ID.
2. Select or randomize condition.
3. Run the CPR scenario.
4. Save the exported JSON.
