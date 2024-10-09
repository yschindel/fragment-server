import fs from "fs";
import multer from "multer";
import { Worker } from "worker_threads";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploads = "uploads";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploads);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fieldNameSize: 300,
    fileSize: 300 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/octet-stream") {
      cb(null, true);
    } else {
      return cb(new Error("Only .ifc file"));
    }
  },
});

function runWorker(filename) {
  return new Promise((resolve, reject) => {
    const workerPath = path.resolve(__dirname, "ifcWorker.js");
    console.log(workerPath);
    const worker = new Worker(workerPath, {
      workerData: { filename },
    });

    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}

export default async function uploadFile(req, res) {
  upload.single("file")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code == "LIMIT_FILE_SIZE") {
        err.message = "Limit size is" + 300 + "MB";
      }
      return res.status(405).json({ message: err.message, result: false });
    } else if (err) {
      return res.status(500).json({ message: err.message, result: false });
    }
    if (!req.file) {
      return res.status(403).json({ message: "File not found", result: false });
    }
    const { filename, originalname } = req.file;

    // Start the worker and immediately respond to the client
    res.status(202).json({ message: "File uploaded, processing started", filename, originalname });

    try {
      const result = await runWorker(filename);
      if (result.success) {
        console.log(`File ${filename} processed successfully`);
      } else {
        console.error(`Error processing file ${filename}: ${result.error}`);
      }
    } catch (error) {
      console.error(`Worker error for file ${filename}: ${error.message}`);
    } finally {
      deleteFile(uploads, filename);
    }
  });
}

function deleteFile(uploads, filename) {
  fs.readdir(uploads, (err, files) => {
    if (err) console.log(err);
    fs.unlink(path.join(uploads, filename), (err) => {
      if (err) console.log(err);
    });
  });
}
