import { parentPort, workerData } from "worker_threads";
import fs from "fs";
import pako from "pako";
import * as OBC from "@thatopen/components";

const wasmDir = "src/ifc/";
const wasmFile = "web-ifc-node.wasm";
const wasmPath = wasmDir + wasmFile;

// Function to download and save WASM file
async function downloadWasmFile(url = "https://unpkg.com/web-ifc@0.0.59/web-ifc-node.wasm", outputPath = wasmPath) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

async function ifcToFragments(filename) {
  if (!fs.existsSync(wasmPath)) {
    console.log("Downloading WASM file");
    await downloadWasmFile();
  }
  const filePath = `uploads/${filename}`;
  const originalname = "test";
  const fileData = fs.readFileSync(filePath);
  const dataArray = new Uint8Array(fileData);
  const components = new OBC.Components();
  const fragments = components.get(OBC.FragmentsManager);
  const loader = components.get(OBC.IfcLoader);

  loader.settings.wasm = {
    path: wasmDir,
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
