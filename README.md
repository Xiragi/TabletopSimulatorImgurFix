# TableTop Simulator Imgur Converter

Fixes Imgur content not available for those in the UK or others. Creates a new game with a yellow border with fixed links that uses catbox.moe. 

A VPN is not required to convert games to remove Imgur. You just need to have the game from workshop downloaded; It doesn't matter if the images show up blocked when you play.

Only one person needs to convert the game (preferably the host), as long as they have permission to change the game.

Once a game is converted, Imgur blocks should be fixed for all UK players that play the converted map.

![Froggy Converted Preview](readme_img/froggy%20converted.png)

## Download

You can find the download for your OS at [release](https://github.com/Xiragi/TabletopSimulatorImgurFix/releases)

## Features
Safe conversion: Non-destructive conversion. Keeps old files.  

Cancel & Resume: Safely pause or cancel conversions at any time. Progress is saved.

Update Detection: Automatically detects if a workshop author pushes an update to a game you already converted, and allows you to reconvert

## Compiling

You can compile the app yourself by doing `pnpm run release`. I am using `pnpm`, but you can substitute it with `npm` and it should be fine. 

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Build the app:
   ```bash
   pnpm run release
   ```
The compiled binaries will be in the `release/` folder.
