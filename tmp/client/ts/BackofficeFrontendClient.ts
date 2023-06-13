import { AxiosInstance, AxiosRequestConfig } from 'axios'
import * as Types from './BackofficeFrontendTypes'

export class BackofficeFrontendClient {
  #httpClient: AxiosInstance

  constructor(httpClient: AxiosInstance) {
    this.#httpClient = httpClient
  }

  async getWidgets1(
    {
      widgetID,
    }: {
      widgetID: string
    },
    config?: AxiosRequestConfig
  ): Promise<Types.GetWidgets1ResponseBody> {
    const path = '/widgets1/{widgetID}'.replace('{widgetID}', widgetID)
    const result = await this.#httpClient.request<Types.GetWidgets1ResponseBody>({
      ...config,
      url: path,
      method: 'get',

      params: { ...config?.params },
    })

    return result.data
  }

  async getWidgets2(
    {
      widgetID,
    }: {
      widgetID: string
    },
    config?: AxiosRequestConfig
  ): Promise<Types.GetWidgets2ResponseBody> {
    const path = '/widgets2/{widgetID}'.replace('{widgetID}', widgetID)
    const result = await this.#httpClient.request<Types.GetWidgets2ResponseBody>({
      ...config,
      url: path,
      method: 'get',

      params: { ...config?.params },
    })

    return result.data
  }
}
