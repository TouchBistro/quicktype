import { JSONSchema, JSONSchemaAttributes, JSONSchemaType, Ref } from "../../quicktype-core/src";

export function nullableAttributeProducer(
    schema: JSONSchema,
    _ref: Ref,
    types: Set<JSONSchemaType>
): JSONSchemaAttributes | undefined {
    if (!(typeof schema === "object")) {
        return undefined;
    }

    if (schema.nullable) {
        types.add("null");
    }
}
