/*
Copyright 2023 SolarWinds Worldwide, LLC.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { spawnSync } from "node:child_process"
import * as process from "node:process"
import { pathToFileURL } from "node:url"

import globby from "globby"

// Patterns recognised as test files by default
const DEFAULTS = [
  "*.test.js",
  "*.test.ts",
  "*.test.cjs",
  "*.test.cts",
  "*.test.mjs",
  "*.test.mts",
]

// Flag to indicate tsconfig.json location
const PROJECT_LONG = "--project"
const PROJECT_LONG_EQ = "--project="
const PROJECT_SHORT = "-p"

// TSX registers a custom loader that lets Node import TypeScript files
const tsxLoaderPath = pathToFileURL(require.resolve("tsx")).toString()
const tsxRequirePath = require.resolve("tsx/preflight")

// Skip Node executable and current script path
let argv = process.argv.slice(2)

let project = "tsconfig.json"
const projectFlagIndex = argv.findIndex(
  (a) =>
    a === PROJECT_LONG ||
    a.startsWith(PROJECT_LONG_EQ) ||
    a.startsWith(PROJECT_SHORT),
)
if (projectFlagIndex > -1) {
  const arg = argv[projectFlagIndex]!

  if (
    (arg === PROJECT_LONG || arg === PROJECT_SHORT) &&
    argv.length >= projectFlagIndex
  ) {
    // Syntax was `--project ${path}` or `-p ${path}`
    project = argv[projectFlagIndex + 1]!
    argv = argv.filter(
      (_v, i) => i < projectFlagIndex || i > projectFlagIndex + 1,
    )
  } else {
    // Syntax was `--project=${path}` or `-p${path}`
    const prefix = arg.startsWith(PROJECT_LONG_EQ)
      ? PROJECT_LONG_EQ
      : PROJECT_SHORT

    project = arg.slice(prefix.length)
    argv = argv.filter((_v, i) => i !== projectFlagIndex)
  }
}

// No list of files given so use default
if (argv.length === 0) {
  argv = DEFAULTS.map((p) => `**/${p}`)
}

// We are not going through a shell to start the process so glob extension is done manually
argv = globby.sync(argv, { gitignore: true, expandDirectories: DEFAULTS })

argv = [
  // Launch Node in test runner mode
  "--test",
  // Use the human readable reporter
  "--test-reporter",
  "spec",
  // Register TSX loaders
  "--require",
  tsxRequirePath,
  "--loader",
  tsxLoaderPath,
  // Forward the rest of our parameters
  ...process.execArgv,
  ...argv,
]

// ESBK_TSCONFIG_PATH is used by TSX to look for a tsconfig.json
const env = { ESBK_TSCONFIG_PATH: project, ...process.env }

const output = spawnSync(process.execPath, argv, {
  env,
  stdio: "inherit",
})
process.exit(output.status ?? 0)
