import { parentPort, workerData } from "worker_threads";
import fs from "fs";
import pako from "pako";
import * as OBC from "@thatopen/components";

async function ifcToFragments(filename) {
  const filePath = `uploads/${filename}`;
  const originalname = "test";
  const fileData = fs.readFileSync(filePath);
  const dataArray = new Uint8Array(fileData);
  const components = new OBC.Components();
  const fragments = components.get(OBC.FragmentsManager);
  const loader = components.get(OBC.IfcLoader);

  loader.settings.wasm = {
    path: "src/ifc/",
    absolute: true,
  };

  await loader.load(dataArray);

  const group = Array.from(fragments.groups.values())[0];
  const fragmentData = fragments.export(group);
  const compressedFrags = pako.deflate(fragmentData);
  fs.writeFileSync(`uploads/${originalname}_frag.gz`, compressedFrags);

  const properties = group.getLocalProperties();
  if (properties) {
    const compressedProperties = pako.deflate(JSON.stringify(properties));
    fs.writeFileSync(`uploads/${originalname}_props.gz`, compressedProperties);
  }

  parentPort.postMessage({ success: true });
}

ifcToFragments(workerData.filename).catch((error) => {
  parentPort.postMessage({ success: false, error: error.message });
});
