import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotoFile(e.target.files[0]);
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!photoFile || !resumeFile) {
      setMessage('Please select both a photo and a resume!');
      return;
    }

    const formData = new FormData();
    formData.append('photo', photoFile);
    formData.append('resume', resumeFile);

    try {
      setMessage('Uploading...');
      const response = await axios.post('/api/upload-files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(`Success! Photo URL: ${response.data.photoUrl}, Resume URL: ${response.data.resumeUrl}`);
    } catch (error) {
      setMessage('Upload failed.');
      console.error(error);
    }
  };

  return (
    <div>
      <h1>File Uploader</h1>
      <div>
        <label>
          Upload Profile Photo (PNG/JPG):
          <input type="file" onChange={handlePhotoChange} accept=".png, .jpg, .jpeg" />
        </label>
      </div>
      <div>
        <label>
          Upload Resume (PDF):
          <input type="file" onChange={handleResumeChange} accept=".pdf" />
        </label>
      </div>
      <button onClick={handleUpload}>Upload Files</button>
      <p>{message}</p>
    </div>
  );
}