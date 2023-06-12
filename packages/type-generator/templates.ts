/* eslint-disable no-restricted-imports */
import { readFileSync } from 'fs'
import { camelCase } from 'change-case'
import Handlebars from 'handlebars'
import { HttpMethods } from './route'

Handlebars.registerHelper(
  'isNotPrimitiveType',
  (type: string) =>
    type != null &&
    type !== 'string' &&
    type !== 'number' &&
    type !== 'boolean' &&
    type !== 'string[]' &&
    type !== 'number[]' &&
    type !== 'boolean[]' &&
    type !== 'Record<string, unknown>'
)
Handlebars.registerHelper(
  'surroundWithCurlyBraces',
  (text) => new Handlebars.SafeString(`{${text}}`)
)
Handlebars.registerHelper('camelCase', (text) => new Handlebars.SafeString(camelCase(text)))

export type TemplateParameter = {
  name: string
  type: TemplateType
}

export type TemplateType = {
  type: string
  isOptional: boolean
  isArray: boolean
  isPrimitive: boolean
}

export type TemplateRoute = {
  name: string
  path: string
  method: HttpMethods
  parameters: TemplateParameter[]
  pathParameters: TemplateParameter[]
  queryParameters: TemplateParameter[]
  request?: TemplateType
  response?: TemplateType
}

type TemplateInput = {
  classPrefix: string
  routes: TemplateRoute[]
}

export const swiftTemplate = Handlebars.compile<TemplateInput>(
  readFileSync('data/codegen-templates/swift-client.hbs').toString()
)
export const tsTemplate = Handlebars.compile<TemplateInput>(
  readFileSync('data/codegen-templates/ts-client.hbs').toString()
)
export const tsIndexTemplate = Handlebars.compile<string[]>(
  readFileSync('data/codegen-templates/ts-index.hbs').toString()
)
