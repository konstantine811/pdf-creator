import type { JscanifyInstance } from '../../types/jscanify'

const OPENCV_URL = 'https://docs.opencv.org/4.7.0/opencv.js'
const JSCANIFY_URL = '/jscanify.js'

let loadPromise: Promise<JscanifyInstance> | null = null

function isOpenCvReady(): boolean {
  return Boolean(window.cv?.Mat)
}

function isJscanifyReady(): boolean {
  return typeof window.jscanify === 'function'
}

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
  if (existing) {
    return existing.dataset.loaded === 'true'
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          existing.addEventListener('load', () => resolve(), { once: true })
          existing.addEventListener(
            'error',
            () => reject(new Error(`Не вдалося завантажити ${src}`)),
            { once: true },
          )
        })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Не вдалося завантажити ${src}`))
    document.head.appendChild(script)
  })
}

function waitForOpenCvReady(maxMs = 120_000): Promise<void> {
  const started = performance.now()

  return new Promise((resolve, reject) => {
    const tick = () => {
      if (isOpenCvReady()) {
        resolve()
        return
      }
      if (performance.now() - started >= maxMs) {
        reject(new Error('OpenCV initialization timed out'))
        return
      }
      window.setTimeout(tick, 50)
    }
    tick()
  })
}

async function loadOpenCvScript(): Promise<void> {
  if (isOpenCvReady()) return
  await loadScript(OPENCV_URL)
  await waitForOpenCvReady()
}

async function loadJscanifyScript(): Promise<void> {
  if (isJscanifyReady()) return
  await loadScript(JSCANIFY_URL)
  if (!isJscanifyReady()) {
    throw new Error('jscanify не ініціалізувався')
  }
}

export async function loadJscanify(): Promise<JscanifyInstance> {
  if (!loadPromise) {
    loadPromise = (async () => {
      await loadOpenCvScript()
      await loadJscanifyScript()
      return new window.jscanify()
    })().catch((error: Error) => {
      loadPromise = null
      throw error
    })
  }

  return loadPromise
}
