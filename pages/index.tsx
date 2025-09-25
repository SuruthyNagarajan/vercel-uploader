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
      setStatusMessage('Upload failed. Please try again.');
      console.error('File upload failed:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-4">
      <div className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-lg">
        <h1 className="text-3xl font-extrabold text-center mb-6 text-blue-600">
          File Submission Portal
        </h1>

        <div className="space-y-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Profile Photo (.png, .jpg, .jpeg)
              <input 
                type="file" 
                onChange={onPhotoSelect} 
                accept=".png, .jpg, .jpeg" 
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Resume (.pdf)
              <input 
                type="file" 
                onChange={onResumeSelect} 
                accept=".pdf" 
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>
          </div>
        </div>

        <button 
          onClick={onFormSubmit} 
          className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Submit Files
        </button>

        {statusMessage && (
          <p className={`mt-4 text-center font-medium ${statusMessage.startsWith('Success') ? 'text-green-600' : 'text-red-600'}`}>
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
