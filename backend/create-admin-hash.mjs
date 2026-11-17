
import bcrypt from "bcryptjs";
import readline from "node:readline";

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

terminal.question("Enter your VERITAS admin password: ", async (password) => {
  if (password.length < 12) {
    console.log("Use a password with at least 12 characters.");
    terminal.close();
    process.exitCode = 1;
    return;
  }

  const hash = await bcrypt.hash(password, 12);

  console.log("\nYour password hash:\n");
  console.log(hash);

  terminal.close();
});
