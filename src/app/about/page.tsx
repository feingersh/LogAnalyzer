import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About · Log Analyzer",
};

export default function About() {
  return (
    <main>
      <h1>About Log Analyzer</h1>
      <p>
        Log Analyzer lists a World of Warcraft character&apos;s recent WarcraftLogs reports and lets you
        open Mythic+ runs to see each pull, the enemies in it, deaths, and the time they cost.
      </p>

      <h2>Data sources</h2>
      <p>
        <a href="https://www.warcraftlogs.com" target="_blank" rel="noreferrer">
          WarcraftLogs
        </a>{" "}
        provides the reports, fights, pulls, deaths and player details, plus the spec and zone icons shown
        in the app. Data is read through its public v2 GraphQL API.
      </p>
      <p>
        <a href="https://raider.io" target="_blank" rel="noreferrer">
          Raider.IO
        </a>{" "}
        provides the dungeon timers used to show whether a key was beaten, and the character profiles that
        player names link to.
      </p>
      <p className="muted">
        Log Analyzer is an independent project. It is not affiliated with or endorsed by WarcraftLogs,
        Raider.IO or Blizzard Entertainment. World of Warcraft is a trademark of Blizzard Entertainment,
        Inc.
      </p>
    </main>
  );
}
