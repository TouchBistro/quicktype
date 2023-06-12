import { AxiosInstance, AxiosRequestConfig } from 'axios'
import * as Types from './BackofficeFrontendTypes'

export class BackofficeFrontendClient {
  #httpClient: AxiosInstance

  constructor(httpClient: AxiosInstance) {
    this.#httpClient = httpClient
  }

  async getOrganizationAddresses(
    {
      widgetID,
    }: {
      widgetID: string
    },
    config?: AxiosRequestConfig
  ): Promise<Types.GetOrganizationAddressesResponseBody> {
    const path = '/widgets1/{widgetID}'.replace('{widgetID}', widgetID)
    const result = await this.#httpClient.request<Types.GetOrganizationAddressesResponseBody>({
      ...config,
      url: path,
      method: 'get',

      params: { ...config?.params },
    })

    return result.data
  }

  async getOrganizationOwnedAddresses(
    {
      widgetID,
    }: {
      widgetID: string
    },
    config?: AxiosRequestConfig
  ): Promise<Types.GetOrganizationOwnedAddressesResponseBody> {
    const path = '/widgets2/{widgetID}'.replace('{widgetID}', widgetID)
    const result = await this.#httpClient.request<Types.GetOrganizationOwnedAddressesResponseBody>({
      ...config,
      url: path,
      method: 'get',

      params: { ...config?.params },
    })

    return result.data
  }
}
