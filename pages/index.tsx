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
    if (!photoFile && !resumeFile) {
      setMessage('Please select a photo, a resume, or both!');
      return;
    }

    const formData = new FormData();
    if (photoFile) formData.append('photo', photoFile);
    if (resumeFile) formData.append('resume', resumeFile);

    try {
      setMessage('Uploading...');
      const response = await axios.post('/api/upload-files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(`Success! ${response.data.message}`);
    } catch (error) {
      setMessage('Upload failed.');
      console.error(error);
    }
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f4f8',
        color: '#333',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '2.5rem',
            marginBottom: '2rem',
            color: '#0070f3',
          }}
        >
          File Uploader
        </h1>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginBottom: '20px',
            textAlign: 'left',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
              }}
            >
              Upload Profile Photo (PNG/JPG):
              <input
                type="file"
                onChange={handlePhotoChange}
                accept=".png, .jpg, .jpeg"
                style={{ marginTop: '5px' }}
              />
            </label>
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
              }}
            >
              Upload Resume (PDF):
              <input
                type="file"
                onChange={handleResumeChange}
                accept=".pdf"
                style={{ marginTop: '5px' }}
              />
            </label>
          </div>
        </div>
        <button
          onClick={handleUpload}
          style={{
            backgroundColor: '#0070f3',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            fontSize: '1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.3s ease',
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = '#005bb5')
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = '#0070f3')
          }
        >
          Upload Files
        </button>
        <p
          style={{
            marginTop: '20px',
            color: message.startsWith('Success') ? 'green' : 'red',
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
