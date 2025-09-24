import formidable, { File } from "formidable";
import clientPromise from "../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';
import { Buffer } from 'buffer';

export const config = {
  api: {
    bodyParser: false, // Keep this for formidable to work
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("image-uploader-db");
  const collection = db.collection("uploads");

  switch (req.method) {
    case 'POST':
      try {
        // First, check if the Content-Type is multipart/form-data
        const contentType = req.headers['content-type'] || '';
        const isFormData = contentType.includes('multipart/form-data');

        let photoData: string | Buffer | null = null;
        let resumeData: string | Buffer | null = null;

        if (isFormData) {
          // Handle form-data upload using formidable
          const form = formidable({});
          const [fields, files] = await form.parse(req) as [any, any];

          const photoFile = files.photo?.[0] as File;
          const resumeFile = files.resume?.[0] as File;

          if (photoFile) {
            photoData = await fs.readFile(photoFile.filepath);
          }
          if (resumeFile) {
            resumeData = await fs.readFile(resumeFile.filepath);
          }
        } else {
          // Handle raw JSON body
          const body = req.body;
          if (body.photo) {
            const photoBase64 = body.photo.replace(/^data:image\/\w+;base64,/, "");
            photoData = Buffer.from(photoBase64, 'base64');
          }
          if (body.resume) {
            const resumeBase64 = body.resume.replace(/^data:application\/\w+;base64,/, "");
            resumeData = Buffer.from(resumeBase64, 'base64');
          }
        }

        // Validate that at least one file was provided
        if (!photoData && !resumeData) {
          return res.status(400).json({ message: "At least one file (photo or resume) is required." });
        }

        const dataToInsert: { [key: string]: any } = {
          createdAt: new Date(),
        };

        if (photoData) {
          dataToInsert.photo = photoData;
        }

        if (resumeData) {
          dataToInsert.resume = resumeData;
        }

        const result = await collection.insertOne(dataToInsert);

        res.status(200).json({
          message: "Files uploaded and data saved!",
          dbId: result.insertedId,
        });
      } catch (error) {
        console.error("Upload or DB save failed:", error);
        res.status(500).json({ message: "Failed to upload files and save data." });
      }
      break;
    
    // ... (rest of the cases are unchanged)
    case 'GET':
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