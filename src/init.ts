import {
  backButton,
  initData,
  init as initSDK,
  miniApp,
  viewport
} from '@telegram-apps/sdk'

export function init() {
  initSDK()

  if (!backButton.isSupported() || !miniApp.isSupported()) {
    throw new Error('ERR_NOT_SUPPORTED')
  }

  backButton.mount()
  miniApp.mount()
  initData.restore()
  viewport.mount()
  /*  setTimeout(() => {
   viewport.requestFullscreen()
   }, 200); */
}