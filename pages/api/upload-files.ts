import formidable, { File } from "formidable";
import clientPromise from "../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import fs from 'fs/promises';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const form = formidable({});

  try {
    const [fields, files] = await form.parse(req) as [any, any];

    const photoFile = files.photo?.[0] as File;
    const resumeFile = files.resume?.[0] as File;

    if (!photoFile || !resumeFile) {
      return res.status(400).json({ message: "Both photo and resume files are required." });
    }

    // Read file content from the temporary file path
    const photoBuffer = await fs.readFile(photoFile.filepath);
    const resumeBuffer = await fs.readFile(resumeFile.filepath);

    // Convert the Buffer to a base64 string
    const photoBase64 = photoBuffer.toString('base64');
    const resumeBase64 = resumeBuffer.toString('base64');

    const client = await clientPromise;
    const db = client.db("image-uploader-db");

    const result = await db.collection("uploads").insertOne({
      // Save the base64 strings directly in MongoDB
      photoBase64: photoBase64,
      resumeBase64: resumeBase64,
      createdAt: new Date(),
    });

    res.status(200).json({
      // Return a message and DB ID, but no URLs
      message: "Files uploaded and data saved!",
      dbId: result.insertedId,
    });
  } catch (error) {
    console.error("Upload or DB save failed:", error);
    res.status(500).json({ message: "Failed to upload files and save data." });
  }
}