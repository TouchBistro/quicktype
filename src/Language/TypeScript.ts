"use strict";

import { Type, ArrayType, UnionType, ClassType, nullableFromUnion, matchType, EnumType, isNamedType } from "../Type";
import { TypeGraph } from "../TypeGraph";
import { utf16StringEscape, camelCase } from "../Strings";

import { Sourcelike, modifySource, MultiWord, singleWord, parenIfNeeded, multiWord } from "../Source";
import { Name } from "../Naming";
import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { BooleanOption, Option } from "../RendererOptions";
import { JavaScriptTargetLanguage, JavaScriptRenderer } from "./JavaScript";

export class TypeScriptTargetLanguage extends JavaScriptTargetLanguage {
    private readonly _justTypes = new BooleanOption("just-types", "Interfaces only", false);
    private readonly _declareUnions = new BooleanOption("explicit-unions", "Explicitly name unions", false);

    constructor() {
        super("TypeScript", ["typescript", "ts", "tsx"], "ts");
    }

    protected getOptions(): Option<any>[] {
        return [this._justTypes, this._declareUnions, this.omitRuntimeTypecheck];
    }

    protected get rendererClass(): new (
        graph: TypeGraph,
        leadingComments: string[] | undefined,
        ...optionValues: any[]
    ) => ConvenienceRenderer {
        return TypeScriptRenderer;
    }
}

class TypeScriptRenderer extends JavaScriptRenderer {
    private readonly _inlineUnions: boolean;

    constructor(
        graph: TypeGraph,
        leadingComments: string[] | undefined,
        private readonly _justTypes: boolean,
        declareUnions: boolean,
        omitRuntimeTypecheck: boolean
    ) {
        super(graph, leadingComments, omitRuntimeTypecheck);
        this._inlineUnions = !declareUnions;
    }

    private sourceFor(t: Type): MultiWord {
        return matchType<MultiWord>(
            t,
            _anyType => singleWord("any"),
            _nullType => singleWord("null"),
            _boolType => singleWord("boolean"),
            _integerType => singleWord("number"),
            _doubleType => singleWord("number"),
            _stringType => singleWord("string"),
            arrayType => {
                const itemType = this.sourceFor(arrayType.items);
                if (
                    (arrayType.items instanceof UnionType && this._inlineUnions) ||
                    arrayType.items instanceof ArrayType
                ) {
                    return singleWord(["Array<", itemType.source, ">"]);
                } else {
                    return singleWord([parenIfNeeded(itemType), "[]"]);
                }
            },
            classType => singleWord(this.nameForNamedType(classType)),
            mapType => singleWord(["{ [key: string]: ", this.sourceFor(mapType.values).source, " }"]),
            enumType => singleWord(this.nameForNamedType(enumType)),
            unionType => {
                if (this._inlineUnions || nullableFromUnion(unionType) !== null) {
                    const children = unionType.children.map(c => parenIfNeeded(this.sourceFor(c)));
                    return multiWord(" | ", ...children.toArray());
                } else {
                    return singleWord(this.nameForNamedType(unionType));
                }
            }
        );
    }

    private emitEnum(e: EnumType, enumName: Name): void {
        this.emitDescription(this.descriptionForType(e));
        this.emitBlock(["export enum ", enumName], "", () => {
            this.forEachEnumCase(e, "none", (name, jsonName) => {
                this.emitLine(name, ` = "${utf16StringEscape(jsonName)}",`);
            });
        });
    }

    private emitClass(c: ClassType, className: Name) {
        this.emitDescription(this.descriptionForType(c));
        this.emitBlock(["export interface ", className], "", () => {
            this.emitPropertyTable(c, (name, _jsonName, p) => {
                const t = p.type;
                let nullable = t instanceof UnionType ? nullableFromUnion(t) : null;
                if (p.isOptional && nullable === null) {
                    nullable = t;
                }
                return [
                    [name, nullable !== null ? "?" : "", ": "],
                    [this.sourceFor(nullable !== null ? nullable : t).source, ";"]
                ];
            });
        });
    }

    emitUnion(u: UnionType, unionName: Name) {
        if (this._inlineUnions) {
            return;
        }

        this.emitDescription(this.descriptionForType(u));

        const children = multiWord(" | ", ...u.children.map(c => parenIfNeeded(this.sourceFor(c))).toArray());
        this.emitLine("export type ", unionName, " = ", children.source, ";");
    }

    protected emitTypes(): void {
        this.forEachNamedType(
            "leading-and-interposing",
            (c, n) => this.emitClass(c, n),
            (e, n) => this.emitEnum(e, n),
            (u, n) => this.emitUnion(u, n)
        );
    }

    protected emitUsageImportComment(): void {
        const topLevelNames: Sourcelike[] = [];
        this.forEachTopLevel(
            "none",
            (_t, name) => {
                topLevelNames.push(", ", name);
            },
            isNamedType
        );
        this.emitLine("//   import { Convert", topLevelNames, ' } from "./file";');
    }

    protected emitUsageComments(): void {
        if (this._justTypes) return;
        super.emitUsageComments();
    }

    protected deserializerFunctionLine(t: Type, name: Name): Sourcelike {
        return ["export function to", name, "(json: string): ", this.sourceFor(t).source];
    }

    protected serializerFunctionLine(t: Type, name: Name): Sourcelike {
        const camelCaseName = modifySource(camelCase, name);
        return ["export function ", camelCaseName, "ToJson(value: ", this.sourceFor(t).source, "): string"];
    }

    protected get moduleLine(): string | undefined {
        return "export module Convert";
    }

    protected get castFunctionLine(): string {
        return "function cast<T>(obj: any, typ: any): T";
    }

    protected get typeAnnotations(): { any: string; anyArray: string; string: string; boolean: string } {
        return { any: ": any", anyArray: ": any[]", string: ": string", boolean: ": boolean" };
    }

    protected emitModuleExports(): void {
        return;
    }

    protected emitConvertModule(): void {
        if (this._justTypes) return;
        super.emitConvertModule();
    }
}
