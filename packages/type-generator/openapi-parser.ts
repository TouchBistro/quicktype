/* eslint-disable no-restricted-imports */
import fs from "fs";
import SwaggerParser from "@apidevtools/swagger-parser";
import { pascalCase } from "change-case";
import { OpenAPIV3 } from "openapi-types";
import YAML from "yaml";
import { Parameter, Type, Primitive, Route, TypegenIR } from "./route";

export async function parseOpenAPIPath(openApiFile: string): Promise<TypegenIR> {
    const routes: Route[] = [];
    const swagger = YAML.parse(fs.readFileSync(openApiFile).toString()) as OpenAPIV3.Document;
    const $refs = await SwaggerParser.resolve(openApiFile);

    if (!swagger.paths) {
        return { routes: [], schemas: {} };
    }
    for (const path of Object.keys(swagger.paths)) {
        const pathInfo = swagger.paths[path];
        if (pathInfo) {
            for (const method of Object.values(OpenAPIV3.HttpMethods)) {
                const methodInfo: OpenAPIV3.OperationObject | undefined = pathInfo[method];
                if (methodInfo == null) {
                    continue;
                }
                try {
                    let firstResponseBody: OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject | undefined =
                        Object.values(methodInfo.responses)[0];
                    if (!methodInfo.operationId) {
                        throw new Error("Method does not have an 'operationId'");
                    }
                    if (methodInfo.requestBody != null && "$ref" in methodInfo.requestBody) {
                        methodInfo.requestBody = $refs.get(methodInfo.requestBody.$ref) as OpenAPIV3.RequestBodyObject;
                    }
                    if (firstResponseBody != null && "$ref" in firstResponseBody) {
                        firstResponseBody = $refs.get(firstResponseBody.$ref) as OpenAPIV3.ResponseObject;
                    }
                    const combinedParameters = [...(pathInfo.parameters ?? []), ...(methodInfo.parameters ?? [])];
                    routes.push({
                        name: pascalCase(methodInfo.operationId),
                        path,
                        method,
                        pathParameters: mapParameters(combinedParameters, $refs, "path"),
                        queryParameters: mapParameters(combinedParameters, $refs, "query"),
                        request: mapBody(methodInfo.requestBody, $refs),
                        response: mapBody(firstResponseBody, $refs)
                    });
                } catch (e) {
                    throw new Error(`Error parsing ${openApiFile} ${path} ${method}: ${e}`);
                }
            }
        }
    }
    return { routes, schemas: swagger.components?.schemas ?? {} };
}

function mapPrimitive(
    schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | undefined,
    $refs: SwaggerParser.$Refs,
    defaultTo: "object" | "string" = "object"
): Omit<Type, "isRequired"> | undefined {
    if (!schema) {
        return undefined;
    }
    if ("$ref" in schema) {
        const ref = $refs.get(schema.$ref) as OpenAPIV3.SchemaObject;
        if (ref.type === "object") {
            const referenceName = schema.$ref.split("/")[schema.$ref.split("/").length - 1];
            return {
                primitive: Primitive.object,
                typeName: referenceName,
                isArray: false,
                schema
            };
        }
        schema = ref;
    }
    switch (schema?.type) {
        case "array": {
            const mappedPrimitive = mapPrimitive(schema.items, $refs);
            if (!mappedPrimitive) {
                return undefined;
            }
            return { ...mappedPrimitive, isArray: true, schema };
        }
        case "integer":
            return { primitive: Primitive.integer, isArray: false, schema };
        case "number":
            return { primitive: Primitive.number, isArray: false, schema };
        case "boolean":
            return { primitive: Primitive.boolean, isArray: false, schema };
        case "string":
            return { primitive: Primitive.string, isArray: false, schema };
        case "object":
            if (!schema.properties || Object.values(schema.properties).length === 0) {
                if (schema.additionalProperties == false) {
                    // Empty object, just return undefined
                    return undefined;
                }
                return { primitive: Primitive.unknown_record, isArray: false, schema };
            }
            return { primitive: Primitive.object, isArray: false, schema };
        default:
            return {
                primitive: defaultTo === "object" ? Primitive.object : Primitive.string,
                isArray: false,
                schema
            };
    }
}

function mapBody(
    body: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject | OpenAPIV3.ResponseObject | undefined,
    $refs: SwaggerParser.$Refs
): Type | undefined {
    if (!body) {
        return undefined;
    }
    if ("$ref" in body) {
        const referenceName = body.$ref.split("/")[body.$ref.split("/").length - 1];
        const reference = $refs.get(body.$ref) as OpenAPIV3.RequestBodyObject;
        return {
            primitive: Primitive.object,
            typeName: referenceName,
            isArray: false,
            schema: body,
            isRequired: reference.required ?? true
        };
    }
    const returnValue = mapPrimitive(body.content?.["application/json"]?.schema, $refs);
    if (returnValue == null) {
        return;
    }
    let isRequired = true;
    if (returnValue && "required" in body && !body.required) {
        isRequired = false;
    }
    return {
        ...returnValue,
        isRequired
    };
}

function mapParameters(
    params: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[] | undefined,
    $refs: SwaggerParser.$Refs,
    type: "path" | "query"
): Parameter[] {
    return (
        params
            ?.map((p): OpenAPIV3.ParameterObject | undefined => {
                if ("$ref" in p) {
                    return $refs.get(p.$ref);
                }
                return undefined;
            })
            .filter(p => p != null && "in" in p && p.in === type)
            .map(p => {
                if (!p) {
                    throw new Error("Primitive is undefined");
                }
                const type = mapPrimitive(p.schema, $refs, "string");
                if (!type) {
                    throw new Error("Primitive is undefined");
                }
                return {
                    name: p.name,
                    type: {
                        ...type,
                        isRequired: p.required ?? true
                    }
                };
            }) ?? []
    );
}
