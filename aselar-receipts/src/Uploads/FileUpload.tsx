import React, { useState } from 'react';
import Dropzone from 'react-dropzone';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './FileUpload.module.css';
import { ClipLoader } from 'react-spinners';

const FileUpload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0); // NEW: progress state

  const handleDrop = (acceptedFiles: File[]) => {
    const totalSize = acceptedFiles.reduce((acc, file) => acc + file.size, 0);

    if (files.length + acceptedFiles.length > 4) {
      setError('You can upload a maximum of 4 files.');
      return;
    }

    if (totalSize + files.reduce((acc, file) => acc + file.size, 0) > 3 * 1024 * 1024) {
      setError('Total file size cannot exceed 3MB.');
      return;
    }

    setFiles((prev) => [...prev, ...acceptedFiles]);
    setPreviews((prev) =>
      [...prev, ...acceptedFiles.map((file) => URL.createObjectURL(file))]
    );
    setError(null);
  };

  const handleUpload = async () => {
    setLoading(true);
    setProgress(0); // Reset progress

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    try {
      const response = await axios.post('http://localhost:5001/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
        onUploadProgress: (event) => {
          const percent = Math.round((event.loaded * 100) / (event.total || 1));
          setProgress(percent);
        },
      });
      console.log(response.data);
      setFiles([]);
      setPreviews([]);
      toast.success('Files uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('File upload failed. Please try again.');
    } finally {
      setLoading(false);
      setProgress(0); // Reset after completion
    }
  };

  return (
    <div className={styles.container}>
      <Dropzone onDrop={handleDrop} multiple={true} maxSize={3 * 1024 * 1024}>
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()} className={styles.dropzone}>
            <input {...getInputProps()} />
            <p>Drag & drop files here, or click to select files</p>
          </div>
        )}
      </Dropzone>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.previewContainer}>
        {previews.map((src, index) => (
          <div key={index} className={styles.preview}>
            {files[index].type.startsWith('image/') ? (
              <img
  src={src}
  alt={`Preview ${index + 1}`}
  className={styles.previewImage}
/>

            ) : (
              <div className={styles.fileIcon}>
                <p>{files[index].name}</p>
                <p>{files[index].type}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {files.length > 0 && (
        <>
          <button
            onClick={handleUpload}
            className={styles.uploadButton}
            disabled={loading}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipLoader size={16} color="#fff" /> Uploading...
              </div>
            ) : (
              'Upload Files'
            )}
          </button>

          {/* 🔥 Progress Bar */}
          {loading && (
            <div
              style={{
                marginTop: '1rem',
                width: '100%',
                height: '10px',
                backgroundColor: '#e0e0e0',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #4a90e2, #007bff)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          )}
        </>
      )}

      <ToastContainer />
    </div>
  );
};

export default FileUpload;
