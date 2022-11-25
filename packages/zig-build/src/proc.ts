import * as cproc from "node:child_process"
import { type Readable } from "node:stream"
import { type Logger } from "./log"

export const exec = (
  cmd: string,
  args: string[],
  options: Omit<cproc.SpawnOptions, "stdio"> & {
    log: Logger
    stdin?: Readable
  },
) =>
  new Promise((res, rej) => {
    options.log(`executing '${cmd} ${args.join(" ")}'`)
    const proc = cproc.spawn(cmd, args, {
      ...options,
      stdio: "pipe",
    })

    proc.once("exit", (code) => {
      if (code === 0) {
        res(code)
      } else {
        rej(code)
      }
    })

    if (options.stdin) {
      options.stdin.pipe(proc.stdin)
    }

    for (const stream of ["stdout", "stderr"] as const) {
      let buffer = Buffer.alloc(0)
      proc[stream].on("data", (data) => {
        buffer = Buffer.concat([buffer, data])
        const lines = buffer.toString("utf8").split("\n")
        buffer = Buffer.from(lines.pop()!, "utf8")
        for (const line of lines) {
          options.log(line)
        }
      })
      proc[stream].once("end", () => options.log(buffer.toString("utf8")))
    }
  })
