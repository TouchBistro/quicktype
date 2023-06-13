/* eslint-disable no-restricted-imports */
import fs from "fs";
import prettier from "prettier";
import { JSONSchemaInput, FetchingJSONSchemaStore, InputData, quicktype } from "../quicktype-core/src";
import { nullableAttributeProducer } from "./quicktype-extensions/Nullable";
import { Parameter, Type, Primitive, Route, TypegenIR } from "./route";
import { swiftTemplate, tsTemplate, TemplateRoute, TemplateParameter } from "./templates";

function toTemplateRoute(route: Route, mapPrimitive: (object: Type) => string): TemplateRoute {
    let request;
    if (route.request) {
        if (route.request.primitive === Primitive.object && route.request.typeName == null) {
            request = {
                type: `${route.name}RequestBody`,
                isOptional: !route.request.isRequired,
                isArray: false,
                isPrimitive: false
            };
        } else {
            request = {
                type: mapPrimitive(route.request),
                isOptional: !route.request.isRequired,
                isArray: route.request.isArray,
                isPrimitive: route.request.typeName == null
            };
        }
    }
    let response;
    if (route.response) {
        if (route.response.primitive === Primitive.object && route.response.typeName == null) {
            response = {
                type: `${route.name}ResponseBody`,
                isOptional: !route.response.isRequired,
                isArray: false,
                isPrimitive: false
            };
        } else {
            response = {
                type: mapPrimitive(route.response),
                isOptional: !route.response.isRequired,
                isArray: route.response.isArray,
                isPrimitive: route.response.typeName == null
            };
        }
    }
    const pathParameters = route.pathParameters.map(r => toTemplateParameter(r, mapPrimitive));
    const queryParameters = route.queryParameters.map(r => toTemplateParameter(r, mapPrimitive));
    return {
        name: route.name,
        path: route.path,
        method: route.method,
        parameters: [...pathParameters, ...queryParameters],
        pathParameters,
        queryParameters,
        request,
        response
    };
}

function toTemplateParameter(parameter: Parameter, mapPrimitive: (object: Type) => string): TemplateParameter {
    return {
        name: parameter.name,
        type: {
            type: mapPrimitive(parameter.type),
            isOptional: !parameter.type.isRequired,
            isPrimitive: parameter.type.typeName == null,
            isArray: parameter.type.isArray
        }
    };
}

export const prettierOptions = {
    semi: false,
    singleQuote: true,
    parser: "typescript",
    printWidth: 100
};

function mapPrimitiveTS(object: Type): string {
    let outputType;
    switch (object.primitive) {
        case Primitive.string:
            outputType = "string";
            break;
        case Primitive.integer:
        case Primitive.number:
            outputType = "number";
            break;
        case Primitive.boolean:
            outputType = "boolean";
            break;
        case Primitive.unknown_record:
            outputType = "Record<string, unknown>";
            break;
        case Primitive.object:
        default:
            outputType = object.typeName;
    }

    if (!outputType) {
        throw new Error(`Type generation error for ${JSON.stringify(object)}`);
    }
    return outputType;
}

function mapPrimitiveSwift(object: Type): string {
    let outputType;
    switch (object.primitive) {
        case Primitive.string:
            outputType = "String";
            break;
        case Primitive.integer:
            outputType = "Int";
            break;
        case Primitive.number:
            outputType = "Double";
            break;
        case Primitive.boolean:
            outputType = "Bool";
            break;
        case Primitive.object:
        default:
            outputType = object.typeName;
    }

    if (!outputType) {
        throw new Error(`Type generation error for ${JSON.stringify(object)}`);
    }
    return outputType;
}

export async function outputGeneratedCode(
    apiName: string,
    { routes, schemas }: TypegenIR,
    type: "swift" | "ts"
): Promise<void> {
    const inputData = new InputData();
    const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore(), [nullableAttributeProducer]);
    const generatedTypes: string[] = [];
    for (const [name, schema] of Object.entries(schemas)) {
        if (!generatedTypes.includes(name)) {
            generatedTypes.push(name);
            await schemaInput.addSource({
                name,
                schema: JSON.stringify(schema).replace(new RegExp("#/components/schemas/", "g"), "")
            });
        }
    }
    for (const route of routes) {
        if (route.request && route.request.primitive === Primitive.object && route.request.typeName == null) {
            const requestName = `${route.name}RequestBody`;
            if (!generatedTypes.includes(requestName)) {
                generatedTypes.push(requestName);
                await schemaInput.addSource({
                    name: requestName,
                    schema: JSON.stringify(route.request.schema).replace(new RegExp("#/components/schemas/", "g"), "")
                });
            }
        }

        if (route.response && route.response.primitive === Primitive.object && route.response.typeName == null) {
            const responseName = `${route.name}ResponseBody`;
            if (!generatedTypes.includes(responseName)) {
                generatedTypes.push(responseName);
                await schemaInput.addSource({
                    name: responseName,
                    schema: JSON.stringify(route.response.schema).replace(new RegExp("#/components/schemas/", "g"), "")
                });
            }
        }
    }
    inputData.addInput(schemaInput);
    if (type === "swift") {
        const tsResult = await quicktype({
            inputData,
            lang: "swift",
            fixedTopLevels: true,
            combineClasses: false,
            rendererOptions: {
                "no-initializers": "true",
                "acronym-style": "original",
                "swift-5-support": "true",
                "access-level": "public"
            }
        });
        fs.writeFileSync(`tmp/client/swift/${apiName}Types.swift`, tsResult.lines.join("\n"));
        fs.writeFileSync(
            `tmp/client/swift/${apiName}Client.swift`,
            swiftTemplate({
                classPrefix: apiName,
                routes: routes.map(r => toTemplateRoute(r, mapPrimitiveSwift))
            })
        );
    } else {
        const tsResult = await quicktype({
            inputData,
            lang: "ts",
            fixedTopLevels: true,
            combineClasses: false,
            rendererOptions: {
                "just-types": "true",
                "prefer-types": "true",
                "acronym-style": "original",
                "explicit-unions": "true"
            }
        });
        fs.writeFileSync(
            `tmp/client/ts/${apiName}Types.ts`,
            prettier.format(tsResult.lines.join("\n"), prettierOptions)
        );
        fs.writeFileSync(
            `tmp/client/ts/${apiName}Client.ts`,
            prettier.format(
                tsTemplate({
                    classPrefix: apiName,
                    routes: routes.map(r => toTemplateRoute(r, mapPrimitiveTS))
                }),
                prettierOptions
            )
        );
    }
}
