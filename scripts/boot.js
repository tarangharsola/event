#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm" : "npm";

function run(step, args, options = {}) {
  process.stdout.write(`\n==> ${step}\n`);

  // On Windows, npm is a .cmd shim and must be run via cmd.exe.
  const cmd = isWin ? (process.env.comspec || "cmd.exe") : npmCmd;
  const cmdArgs = isWin ? ["/d", "/s", "/c", [npmCmd, ...args].join(" ")] : args;

  const result = spawnSync(cmd, cmdArgs, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.error) {
    console.error(`\n[boot] Failed to run: ${npmCmd} ${args.join(" ")}`);
    console.error(result.error);
    process.exit(1);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    console.error(`\n[boot] Step failed (${result.status}): ${step}`);
    process.exit(result.status);
  }
}

run("Install root dependencies", ["install"]);
run("Install client dependencies", ["--prefix", "client", "install"]);
run("Build client", ["run", "build"]);
run("Start server", ["start"]);
