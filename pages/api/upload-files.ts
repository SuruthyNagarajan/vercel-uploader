import formidable, { File } from "formidable";
import clientPromise from "../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';
import { Buffer } from 'buffer';

export const config = {
  api: {
    // This is crucial. We disable the default body parser so that formidable
    // can handle 'multipart/form-data' requests.
    bodyParser: false,
  },
};

// Helper function to manually parse a JSON body from a request stream.
// This is necessary because bodyParser is disabled for all requests.
function parseJsonBody(req: NextApiRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (body === '') {
          // Resolve with an empty object if there's no body content
          resolve({});
        } else {
          // Parse the full JSON string and resolve
          resolve(JSON.parse(body));
        }
      } catch (e) {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("image-uploader-db");
  const collection = db.collection("uploads");

  const MAX_MONGO_SIZE = 16 * 1024 * 1024; // 16 MB in bytes

  switch (req.method) {
    case 'POST':
      try {
        const contentType = req.headers['content-type'] || '';
        const isFormData = contentType.includes('multipart/form-data');
        const isJson = contentType.includes('application/json');

        let photoData: Buffer | null = null;
        let resumeData: Buffer | null = null;
        
        if (isFormData) {
          // Case 1: Handle multipart/form-data (used by your webpage)
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
        } else if (isJson) {
          // Case 2: Handle raw JSON body (used by your Postman request)
          const body = await parseJsonBody(req);
          
          if (body.photo) {
            const photoBase64 = body.photo.replace(/^data:image\/\w+;base64,/, "");
            try {
              photoData = Buffer.from(photoBase64, 'base64');
            } catch (e) {
              return res.status(400).json({ message: "Invalid Base64 string for photo." });
            }
          }
          if (body.resume) {
            const resumeBase64 = body.resume.replace(/^data:application\/\w+;base64,/, "");
            try {
              resumeData = Buffer.from(resumeBase64, 'base64');
            } catch (e) {
              return res.status(400).json({ message: "Invalid Base64 string for resume." });
            }
          }
        } else {
          // Handle unrecognized Content-Type
          return res.status(415).json({ message: `Unsupported Content-Type: ${contentType}` });
        }

        // --- Common logic for both cases starts here ---
        if (!photoData && !resumeData) {
          return res.status(400).json({ message: "At least one file (photo or resume) is required." });
        }
        
        // Check file sizes against MongoDB's 16MB limit
        if (photoData && photoData.length > MAX_MONGO_SIZE) {
          return res.status(413).json({ message: "Photo file size exceeds the 16 MB limit." });
        }
        if (resumeData && resumeData.length > MAX_MONGO_SIZE) {
          return res.status(413).json({ message: "Resume file size exceeds the 16 MB limit." });
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