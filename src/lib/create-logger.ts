export type Logger = (...args: unknown[]) => void

export const createLogger = (debug: boolean): Logger => {
  if (!debug) {
    return () => {}
  }

  return (...args: unknown[]) => {
    console.info(...args)
  }
}
