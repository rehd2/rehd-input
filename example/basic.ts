import TextInput from "../src/index.ts";

async function main() {
  console.log("--- Basic Prompt Example ---\n");

  const response = await TextInput({
    prefixText: "❯",
    prefixColor: "cyan",
    placeholder: "Type a message or mention someone with @username...",
    styles: {
      backgroundColor: "#1a1a2e",
      wordHighlight: {
        prefix: "@",
        color: "magenta",
      },
      paddingTop: 1,
      paddingBottom: 1,
    },
  });

  console.log("\nUser Submitted:", response);
}

main().catch(console.error);

