import formidable, { File } from "formidable";
import clientPromise from "../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';
import { Buffer } from 'buffer';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseJsonBody(req: NextApiRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (body === '') {
          resolve({});
        } else {
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const client = await clientPromise;
  const db = client.db("image-uploader-db");
  const collection = db.collection("uploads");

  try {
    const contentType = req.headers['content-type'] || '';
    const isFormData = contentType.includes('multipart/form-data');
    const isJson = contentType.includes('application/json');

    let photoData: Buffer | null = null;
    let resumeData: Buffer | null = null;

    if (isFormData) {
      const form = formidable({});
      const [fields, files] = await form.parse(req) as [any, any];

      const photoFile = files.profilePhoto?.[0] as File;
      const resumeFile = files.resumeDocument?.[0] as File;

      if (photoFile) {
        photoData = await fs.readFile(photoFile.filepath);
      }
      if (resumeFile) {
        resumeData = await fs.readFile(resumeFile.filepath);
      }
    } else if (isJson) {
      const body = await parseJsonBody(req);
      
      if (body.photo) {
        const photoBase64 = body.photo.replace(/^data:image\/\w+;base64,/, "");
        photoData = Buffer.from(photoBase64, 'base64');
      }
      if (body.resume) {
        const resumeBase64 = body.resume.replace(/^data:application\/\w+;base64,/, "");
        resumeData = Buffer.from(resumeBase64, 'base64');
      }
    } else {
      return res.status(415).json({ message: `Unsupported Content-Type: ${contentType}` });
    }

    if (!photoData && !resumeData) {
      return res.status(400).json({ message: "At least one file (photo or resume) is required." });
    }

    const MAX_MONGO_SIZE = 16 * 1024 * 1024;
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
}
