export interface Respons<T> {
  status: number
  data: T
}

// Pemanggil fetch tipis: selalu mengembalikan status + JSON (atau {} bila tak ada isi).
export async function panggil<T = Record<string, unknown>>(
  path: string,
  opsi: { method?: string; body?: unknown } = {},
): Promise<Respons<T>> {
  const res = await fetch(`/api${path}`, {
    method: opsi.method ?? (opsi.body !== undefined ? 'POST' : 'GET'),
    headers: opsi.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opsi.body !== undefined ? JSON.stringify(opsi.body) : undefined,
    credentials: 'same-origin',
  })
  const teks = await res.text()
  return { status: res.status, data: (teks ? JSON.parse(teks) : {}) as T }
}
