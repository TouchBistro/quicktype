export type TypegenIR = {
  routes: Route[]
  // The schemas section of the OpenAPI spec
  schemas: Record<string, unknown>
}

export type Route = {
  name: string
  path: string
  method: HttpMethods
  pathParameters: Parameter[]
  queryParameters: Parameter[]
  request?: Type
  response?: Type
}

export type HttpMethods = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head' | 'trace'

export enum Primitive {
  string = 'string',
  number = 'number',
  integer = 'integer',
  boolean = 'boolean',
  object = 'object',
  unknown_record = 'unknown_record',
}

export type Parameter = {
  name: string
  type: Type
}

export type Type = {
  primitive: Primitive
  typeName?: string
  schema: unknown
  isArray: boolean
  isRequired: boolean
}
