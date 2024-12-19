# GENERATE ROUT

```ts
import { exec } from "child_process";
import fs from "fs/promises";
import _ from "lodash";
import path from "path";
import readdirp, { EntryInfo } from "readdirp";
import util from "util";
const execPromise = util.promisify(exec);

export async function generate() {
  await fs.mkdir(path.join(process.cwd(), "src/lib"), { recursive: true });
  const pages: string[] = [];
  const apies: string[] = [];

  for await (const entry of readdirp("src/app", {
    fileFilter: (entry) => {
      return entry.basename === "route.ts" || entry.basename === "page.tsx";
    }
  })) {
    const extract = await extractTextWithinBrackets(entry);

    if (entry.basename === "page.tsx") {
      pages.push(extract);
    } else {
      apies.push(extract);
    }
  }

  const exportText = `
  export const pages = {
    ${pages.join(",\n")}
  }

  export const apies = {
    ${apies.join(",\n")}
  }
  `;

  const targetPath = path.join(process.cwd(), "src/lib/routes.ts");
  await fs.writeFile(targetPath, exportText);
  const { stdout } = await execPromise(`npx prettier ${targetPath} --write`);
  console.log("Success");
}

async function extractTextWithinBrackets(entry: EntryInfo): Promise<string> {
  const textFile = await fs.readFile(entry.fullPath, "utf8");

  const listMethod = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"];
  const regexMethod = new RegExp(`(${listMethod.join("|")})`, "g");
  const matchMethod = textFile.match(regexMethod);
  const method = matchMethod ? matchMethod[0].trim() : "";

  const str = "/" + _.trim(path.dirname(entry.path), ".");
  const regex = /\[([^\]]+)\]/g;
  const matches = str.match(regex) || [];

  const param = _.map(matches, (match) => {
    const replace = _.trim(match, "[]");

    // Tangani jika menemukan [...slug]
    if (replace.startsWith("...")) {
      return `${replace.substring(3)}`; // Contoh: "path" untuk [...path]
    }

    return `${replace}`;
  });

  const parameters = _.map(matches, (match) => {
    const replace = _.trim(match, "[]");

    // Tangani jika menemukan [...slug]
    if (replace.startsWith("...")) {
      return `${replace.substring(3)}: string[]`; // Contoh: "path: string[]"
    }

    return `${replace}: string`;
  });

  const pathResult = _.reduce(
    matches,
    (result, match) => {
      const replace = _.trim(match, "[]");

      // Tangani jika menemukan [...slug]
      if (replace.startsWith("...")) {
        return _.replace(result, match, `\${${replace.substring(3)}.join("/")}`);
      }

      return _.replace(result, match, `\${${replace}}`);
    },
    str
  );

  const typeEmpty = `"${str}": "${pathResult}"`;
  const typeSlug = `"${str}": ({${param.join(", ")}}:{${parameters.join(
    ", "
  )}}) => \`${pathResult}\``;

  return _.isEmpty(parameters) ? typeEmpty : typeSlug;
}
```
