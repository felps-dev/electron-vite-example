import { NsisUpdater, Provider, ResolvedUpdateFileInfo, UpdateInfo } from 'electron-updater'
// Or MacUpdater, AppImageUpdater
import url from 'url'
import { app } from 'electron'
import { ElectronHttpExecutor } from 'electron-updater/out/electronHttpExecutor'
import { PublishOptions } from 'electron-publish'

interface CustomPublishOptions extends PublishOptions {
  updateProvider: typeof NumaWindowsUpdateProvider
  provider: 'custom'
}

class NumaWindowsUpdateProvider extends Provider<UpdateInfo> {
  constructor() {
    super({
      isUseMultipleRangeRequest: true,
      platform: 'win32',
      executor: new ElectronHttpExecutor()
    })
  }

  async getLatestVersion(): Promise<UpdateInfo> {
    const info_url = new URL(
      '/latest_numa_app',
      app.isPackaged ? 'https://numa.com/api' : 'http://127.0.0.1:8000'
    )
    const data = await this.httpRequest(info_url, {
      method: 'GET'
    }).then((response) => JSON.parse(response ?? ''))

    return {
      version: data.version,
      files: [
        {
          url: data.url,
          sha512: data.sha512
        }
      ],
      path: data.url,
      sha512: data.sha512,
      releaseDate: data.release_date
    }
  }
  resolveFiles(updateInfo: UpdateInfo): Array<ResolvedUpdateFileInfo> {
    return [
      {
        url: new url.URL(updateInfo.files[0].url),
        info: updateInfo.files[0]
      }
    ]
  }
}

export default class AppUpdater {
  updaterInterval!: NodeJS.Timeout

  stopInterval(): void {
    clearInterval(this.updaterInterval)
  }

  startInterval(token?: string): void {
    const options: CustomPublishOptions = {
      updateProvider: NumaWindowsUpdateProvider,
      provider: 'custom'
    }

    const autoUpdater = new NsisUpdater(options)
    if (!app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true
    }
    autoUpdater.disableWebInstaller = true
    autoUpdater.requestHeaders = {
      Authorization: `Token ${token}`
    }
    autoUpdater.checkForUpdates()
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...')
    })
    autoUpdater.on('update-available', () => {
      console.log('Update available.')
    })
    autoUpdater.on('update-not-available', () => {
      console.log('Update not available.')
    })
    autoUpdater.on('error', () => {
      console.log('Error in auto-updater.')
    })
    autoUpdater.on('download-progress', () => {
      console.log('Download progress...')
    })
    autoUpdater.on('update-downloaded', () => {
      autoUpdater.quitAndInstall(true, true)
    })
    this.updaterInterval = setInterval(
      () => {
        autoUpdater.checkForUpdates()
      },
      1000 * 60 * 15
    ) // 15 minutes
  }

  restartUpdater(token?: string): void {
    this.stopInterval()
    this.startInterval(token)
  }

  constructor(token?: string) {
    this.startInterval(token)
  }
}
