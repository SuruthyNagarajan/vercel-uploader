import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import formidable, { File } from 'formidable';
import { promises as fs } from 'fs';
import { Buffer } from 'buffer';

export const config = {
    api: {
        bodyParser: false,
    },
};

function parseJsonBody(req: NextApiRequest): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", () => {
            try {
                resolve(body === "" ? {} : JSON.parse(body));
            } catch (e) {
                reject(new Error("Invalid JSON body."));
            }
        });
        req.on("error", (err) => reject(err));
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const client = await clientPromise;
    const db = client.db('image-uploader-db');
    const collection = db.collection('uploads');

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);

    try {
        switch (req.method) {
            case 'POST': {
                const contentType = req.headers["content-type"] || "";
                const isFormData = contentType.includes("multipart/form-data");
                const isJson = contentType.includes("application/json");

                let photoData: Buffer | null = null;
                let resumeData: Buffer | null = null;

                if (isFormData) {
                    const form = formidable({});
                    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
                        form.parse(req, (err, fields, files) => {
                            if (err) return reject(err);
                            resolve([fields, files]);
                        });
                    });

                    const photoFile = files.photo?.[0] as File;
                    const resumeFile = files.resume?.[0] as File;

                    if (photoFile) {
                        photoData = await fs.readFile(photoFile.filepath);
                        await fs.unlink(photoFile.filepath);
                    }
                    if (resumeFile) {
                        resumeData = await fs.readFile(resumeFile.filepath);
                        await fs.unlink(resumeFile.filepath);
                    }
                } else if (isJson) {
                    const body = await parseJsonBody(req);
                    if (body.photo) {
                        const photoBase64 = body.photo.replace(/^data:image\/\w+;base64,/, "");
                        photoData = Buffer.from(photoBase64, "base64");
                    }
                    if (body.resume) {
                        const resumeBase64 = body.resume.replace(/^data:application\/\w+;base64,/, "");
                        resumeData = Buffer.from(resumeBase64, "base64");
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

                const dataToInsert: { [key: string]: any } = { createdAt: new Date() };
                if (photoData) dataToInsert.photoBase64 = photoData.toString('base64');
                if (resumeData) dataToInsert.resumeBase64 = resumeData.toString('base64');

                const result = await collection.insertOne(dataToInsert);

                return res.status(200).json({
                    message: "Files uploaded and data saved!",
                    _id: result.insertedId,
                });
            }

            case 'GET': {
                const uploads = await collection.find({}).project({ photoBase64: 0, resumeBase64: 0 }).toArray();
                return res.status(200).json(uploads);
            }

            case 'DELETE': {
                const { id } = req.query;

                if (!id || typeof id !== 'string') {
                    return res.status(400).json({ message: 'Missing or invalid file ID for deletion.' });
                }

                const result = await collection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).json({ message: 'File not found or already deleted.' });
                }

                return res.status(200).json({
                    message: 'File deleted successfully',
                    deletedCount: result.deletedCount,
                });
            }

            case 'PUT': {
                return res.status(501).json({ message: 'PUT method is not implemented.' });
            }

            default:
                res.status(405).json({ message: `Method ${req.method} Not Allowed` });
                break;
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
    }
}
