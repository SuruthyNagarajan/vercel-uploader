import formidable, { File } from "formidable";
import clientPromise from "../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import fs from 'fs/promises';
import { ObjectId } from 'mongodb';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("image-uploader-db");
  const collection = db.collection("uploads");

  switch (req.method) {
    case 'POST':
      // CREATE operation: Upload and save new files
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

        const result = await collection.insertOne({
          photoBase64: photoBase64,
          resumeBase64: resumeBase64,
          createdAt: new Date(),
        });

        res.status(200).json({
          message: "Files uploaded and data saved!",
          dbId: result.insertedId,
        });
      } catch (error) {
        console.error("Upload or DB save failed:", error);
        res.status(500).json({ message: "Failed to upload files and save data." });
      }
      break;

    case 'GET':
      // READ operation: Fetch all file records
      try {
        const files = await collection.find({}).toArray();
        res.status(200).json(files);
      } catch (error) {
        console.error("Error fetching files:", error);
        res.status(500).json({ message: "Failed to fetch files." });
      }
      break;

    case 'PUT':
    case 'PATCH':
      // UPDATE operation: Update an existing file record
      try {
        const { id } = req.query;
        if (!id || !ObjectId.isValid(id as string)) {
          return res.status(400).json({ message: "Invalid file ID provided." });
        }
        
        const updates = req.body;
        
        const result = await collection.updateOne(
          { _id: new ObjectId(id as string) },
          { $set: updates }
        );
        
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "File not found." });
        }

        res.status(200).json({ message: "File updated successfully." });
      } catch (error) {
        console.error("Error updating file:", error);
        res.status(500).json({ message: "Failed to update file." });
      }
      break;
      
    case 'DELETE':
      // DELETE operation: Delete a file record by ID
      try {
        const { id } = req.query;
        if (!id || !ObjectId.isValid(id as string)) {
          return res.status(400).json({ message: "Invalid file ID provided." });
        }

        const result = await collection.deleteOne({ _id: new ObjectId(id as string) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "File not found." });
        }
        res.status(200).json({ message: "File deleted successfully." });
      } catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).json({ message: "Failed to delete file." });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
