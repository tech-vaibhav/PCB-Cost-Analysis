/**
 * api.js — Centralized API client for PCB Cost Analyzer backend.
 *
 * All backend calls go through here. The base URL points directly
 * to the FastAPI dev server. No Vite proxy needed.
 */

const BASE_URL = 'http://127.0.0.1:8000'

/**
 * Upload a Gerber ZIP and parse it.
 * @param {File} file  — the ZIP file object from the input
 * @returns {Promise<object>} — ParsedGerberResult JSON
 */
export async function parseGerber(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE_URL}/api/parse`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

/**
 * Calculate PCB fabrication price.
 * @param {{ length_mm, width_mm, quantity, material, thickness, micro }} params
 * @returns {Promise<object|null>} — pricing JSON or null on invalid input
 */
export async function calculatePrice(params) {
  const res = await fetch(`${BASE_URL}/api/price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) return null
  return res.json()
}
