const index = "modules";

interface Module {
  id: string;
  name: string;
  versions: Array<string>;
  readme: string;
}

interface Versions {
  latest: string;
  versions: Array<string>;
}

async function main() {
  await createIndex(index);
  for await (const mod of readModules("/home/wperron/deno/")) {
    indexDocument(index, JSON.stringify([mod]))
      .then((res) => console.log(`successfully indexed ${mod.name}: ${JSON.stringify(res)}`))
      .catch((err) => console.error(`failed to index ${mod.name}: ${err}`));
  }
}

async function* readModules(root: string): AsyncGenerator<Module> {
  for await (const mod of Deno.readDir(root)) {
    const rawVersions = await Deno.readTextFile(
      `${root}/${mod.name}/meta/versions.json`,
    );
    const versions = JSON.parse(rawVersions) as Versions;

    // Some of my data is missing due to how long it would have taken to
    // download every version of every module. This snippet makes sure that
    // each module has a readme information by getting the most recent one
    // I have on disk.
    let i = 0;
    let README: string = "";
    do {
      let latest = versions.versions[i];
      if (latest === undefined) break;
      README = await Deno.readTextFile(
        `${root}/${mod.name}/versions/${latest}/raw/README.md`,
      ).catch(() => undefined) ?? "";
      i++;
    } while (!README);

    yield {
      id: mod.name,
      name: mod.name,
      versions: versions.versions,
      readme: README,
    };
  }
}

async function indexDocument(index: string, document: string): Promise<any> {
  return fetch(`http://localhost:7700/indexes/${index}/documents`, {
    method: "POST",
    body: document,
  })
    .then((res) => res.json())
    .catch((err) => err);
}

async function createIndex(index: string): Promise<any> {
  return fetch(
    "http://localhost:7700/indexes",
    {
      method: "POST",
      body: JSON.stringify({ uid: "modules" }),
    },
  )
    .then((res) => res.json())
    .catch((err) => err);
}

await main();
