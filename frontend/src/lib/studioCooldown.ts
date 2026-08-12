const STUDIO_COOLDOWN_MS = 30_000
let cooldownUntil = 0

export function enterStudioCooldown(): void {
  cooldownUntil = Math.max(cooldownUntil, Date.now() + STUDIO_COOLDOWN_MS)
}

export function studioCooldownDelay(): number | false {
  const remaining = cooldownUntil - Date.now()
  return remaining > 0 ? remaining : false
}
