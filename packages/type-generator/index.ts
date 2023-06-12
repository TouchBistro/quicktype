/* eslint-disable no-restricted-imports */
import fs from "fs";
import { pascalCase } from "change-case";
import { glob } from "glob";
import prettier from "prettier";
import { parseOpenAPIPath } from "./openapi-parser";
import { outputGeneratedCode, prettierOptions } from "./output";
import { tsIndexTemplate } from "./templates";

async function generateClient(paths: string[], target: "ts" | "swift"): Promise<void> {
    const invenueOpenApiFiles = await glob(paths);
    fs.mkdirSync(`tmp/client/${target}`, { recursive: true });
    const files: string[] = [];
    for (const openApiFile of invenueOpenApiFiles) {
        const apiName = pascalCase(
            openApiFile.replace(".yaml", "").replace("data/openapi/", "").replace("_openapi", "")
        );
        const ir = await parseOpenAPIPath(openApiFile);
        await outputGeneratedCode(apiName, ir, target);
        files.push(apiName);
    }
    if (target === "ts") {
        fs.writeFileSync(`tmp/client/${target}/index.ts`, prettier.format(tsIndexTemplate(files), prettierOptions));
    }
}

async function main(): Promise<void> {
    await generateClient(["data/openapi/**/*invenue*.yaml", "data/openapi/**/*invenue*/**/*.yaml"], "swift");
    await generateClient(
        [
            "data/openapi/**/*invenue*.yaml",
            "data/openapi/**/*invenue*/**/*.yaml",
            "data/openapi/**/*frontend*.yaml",
            "data/openapi/**/*frontend*/**/*.yaml"
        ],
        "ts"
    );
}

main().catch(err => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});
