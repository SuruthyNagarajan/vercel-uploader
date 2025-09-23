import formidable, { File } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import clientPromise from "../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false,
  },
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

    const photoResult = await cloudinary.uploader.upload(photoFile.filepath as string, {
      folder: "profile-photos",
      resource_type: "image",
    });

    const resumeResult = await cloudinary.uploader.upload(resumeFile.filepath as string, {
      folder: "resumes",
      resource_type: "raw",
    });

    const client = await clientPromise;
    const db = client.db("image-uploader-db");

    const result = await db.collection("uploads").insertOne({
      photoUrl: photoResult.secure_url,
      resumeUrl: resumeResult.secure_url,
      createdAt: new Date(),
    });

    res.status(200).json({
      message: "Files uploaded and data saved!",
      photoUrl: photoResult.secure_url,
      resumeUrl: resumeResult.secure_url,
      dbId: result.insertedId,
    });
  } catch (error) {
    console.error("Upload or DB save failed:", error);
    res.status(500).json({ message: "Failed to upload files and save data." });
  }
}