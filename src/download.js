import express from "express";
import fs from "fs";
import * as pako from "pako";

const router = express.Router();
router.get("/:fileId", async (req, res) => {
	try {
		const { fileId } = req.params;
		const { scope } = req.query;
		if (!fileId) return res.status(405).json({ message: "Missing param" });
		let buffer = fs.readFileSync("uploads/" + fileId);
		if (scope && scope === "json") {
			console.log("scope", scope);
			buffer = pako.inflate(buffer, { to: "string" });
			res.write(buffer);
			res.write("\n\n");
			res.end();
		} else {
			console.log("fileId", fileId);
			getFileWeb(res, fileId, buffer, 'ifc'); // Add file type parameter
		}
	} catch (error) {
		console.log(error);
		res.status(500).json(error);
	}
});

function getFileWeb(res, fileId, buffer, fileType = 'gz') {
	const contentTypes = {
		'gz': 'application/octet-stream',
		'ifc': 'application/x-step'
	};

	res.setHeader("Content-Type", contentTypes[fileType] || 'application/octet-stream');
	res.setHeader("Content-Disposition", `attachment; filename="${fileId}.${fileType}"`);
	res.setHeader("Content-Length", buffer.length);

	res.write(buffer);
	res.end();
}

export default router;
