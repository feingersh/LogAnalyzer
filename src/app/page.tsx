import CharacterLookup from "@/components/CharacterLookup";

export default function Home() {
  return (
    <main>
      <h1>Log Analyzer</h1>
      <p>Pick your server and character to see recent WarcraftLogs reports.</p>
      <CharacterLookup />
    </main>
  );
}
