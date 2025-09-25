import { useState } from 'react';
import axios from 'axios';
import type { ChangeEvent } from 'react';

export default function Home() {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const onPhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      setPhotoFile(event.target.files[0]);
    }
  };

  const onResumeSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      setResumeFile(event.target.files[0]);
    }
  };

  const onFormSubmit = async () => {
    if (!photoFile && !resumeFile) {
      setStatusMessage('Please select a photo or a resume to proceed.');
      return;
    }

    const payload = new FormData();
    if (photoFile) {
      payload.append('profilePhoto', photoFile);
    }
    if (resumeFile) {
      payload.append('resumeDocument', resumeFile);
    }

    try {
      setStatusMessage('Uploading...');
      const response = await axios.post('/api/upload-files', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setStatusMessage('Success! Files uploaded successfully.');
    } catch (error) {
      setStatusMessage('Upload failed.');
      console.error('File upload failed:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-4 font-sans">
      <div className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-lg text-center">
        <h1 className="text-3xl font-extrabold text-blue-600 mb-6">
          File Uploader
        </h1>
        <div className="space-y-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
              Upload Profile Photo (PNG/JPG)
            </label>
            <div className="flex items-center gap-2">
              <label className="bg-blue-50 text-blue-700 font-semibold py-2 px-4 rounded-full border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                Choose File
                <input
                  type="file"
                  onChange={onPhotoSelect}
                  accept=".png, .jpg, .jpeg"
                  className="hidden"
                />
              </label>
              <span className="text-sm text-gray-500 truncate">
                {photoFile ? photoFile.name : 'No file chosen'}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
              Upload Resume (PDF)
            </label>
            <div className="flex items-center gap-2">
              <label className="bg-blue-50 text-blue-700 font-semibold py-2 px-4 rounded-full border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                Choose File
                <input
                  type="file"
                  onChange={onResumeSelect}
                  accept=".pdf"
                  className="hidden"
                />
              </label>
              <span className="text-sm text-gray-500 truncate">
                {resumeFile ? resumeFile.name : 'No file chosen'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onFormSubmit}
          className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Upload Files
        </button>
        {statusMessage && (
          <p
            className={`mt-4 text-center font-medium ${
              statusMessage.startsWith('Success')
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
