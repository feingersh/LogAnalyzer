import CharacterLookup from "@/components/CharacterLookup";

export default function Home() {
  return (
    <main>
      <p>Pick your server and character to see recent WarcraftLogs reports.</p>
      <CharacterLookup />
    </main>
  );
}
