export type Widget = any[] | boolean | WidgetClass | number | number | null | string

export type WidgetClass = {
  name: string
}

export type Error = {
  /**
   * error code
   */
  code?: string
  /**
   * error message
   */
  message?: string
  [property: string]: any
}

export type GetOrganizationOwnedAddressesResponseBody =
  | any[]
  | boolean
  | WidgetClass
  | number
  | null
  | string
