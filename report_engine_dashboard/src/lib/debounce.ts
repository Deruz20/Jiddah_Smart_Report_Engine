export function debounce<T extends (...args: any[]) => void>(fn: T, delayMs = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function debounced(this: unknown, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn.apply(this, args)
    }, delayMs)
  }
}
