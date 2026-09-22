import TextInput from "../src/index.ts";

async function chatLoop() {
  const historyStack: string[] = ["/help", "@dev status report", "npm run build"];

  console.log("--- Interactive Loop with History ---");
  console.log("(Press UP/DOWN arrows when input is empty to navigate history)\n");

  while (true) {
    const input = await TextInput({
      prefixText: "ai>",
      prefixColor: "green",
      placeholder: "Ask something or use UP/DOWN for history...",
      history: historyStack,
      MAX_HISTORY_SIZE: 10,
      styles: {
        backgroundColor: "#121212",
        wordHighlight: {
          prefix: "@",
          color: "cyan",
        },
      },
    });

    if (input === "exit" || input === "quit") {
      console.log("\nExiting...");
      break;
    }

    console.log(`\nProcessing command: "${input}"\n`);
  }
}

chatLoop().catch(console.error);

