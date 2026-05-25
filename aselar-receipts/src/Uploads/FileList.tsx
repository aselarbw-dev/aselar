// FileList.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilePdf, 
  faFileWord, 
  faFileImage, 
  faFile, 
  faDownload, 
  faTrash,
  faEye,
  faTimes,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { ClipLoader } from 'react-spinners';
import styles from './FileList.module.css';

interface File {
  _id: string;
  filename: string;
  url: string;
  format: string;
  size: number;
  createdAt: string;
}

interface DeleteModalProps {
  isOpen: boolean;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({
  isOpen,
  fileName,
  onConfirm,
  onCancel,
  isDeleting
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <FontAwesomeIcon icon={faExclamationTriangle} className={styles.warningIcon} />
          <h3>Confirm Deletion</h3>
          <button className={styles.closeButton} onClick={onCancel}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p>Are you sure you want to delete this file?</p>
          <p className={styles.fileName}>"{fileName}"</p>
          <p className={styles.warningText}>This action cannot be undone.</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className={styles.confirmButton} onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <ClipLoader size={16} color="#fff" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTrash} />
                <span>Delete File</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const FileList: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    fileId: string;
    fileName: string;
  }>({
    isOpen: false,
    fileId: '',
    fileName: ''
  });

  useEffect(() => {
    fetchFiles(currentPage);
  }, [currentPage]);

  const fetchFiles = async (page: number) => {
    try {
      const response = await axios.get('http://localhost:5001/api/files', {
        params: { page, limit: 10 },
        withCredentials: true,
      });
      setFiles(response.data.files);
      setTotalPages(response.data.totalPages);
      setTotalFiles(response.data.totalFiles);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (url: string, filename: string, id: string) => {
    setDownloadingId(id);
    try {
      // Fetch the file as a blob to bypass browser previews (e.g., Cloudinary inline viewing)
      const response = await axios.get(url, { 
        responseType: 'blob',
        // Optional: Add timeout or other axios config if needed for large files
      });
      
      // Create a blob from the response data with the appropriate MIME type
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'application/octet-stream' 
      });
      
      // Create a temporary object URL for the blob
      const downloadUrl = URL.createObjectURL(blob);
      
      // Create and trigger the download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename; // Ensures the original filename with extension is used
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the temporary URL
      URL.revokeObjectURL(downloadUrl);
      
      toast.success('Download started!');
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to download file: ${error.message || 'Unknown error'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const openDeleteModal = (fileId: string, fileName: string) => {
    setDeleteModal({
      isOpen: true,
      fileId,
      fileName
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      fileId: '',
      fileName: ''
    });
  };

  const handleDelete = async () => {
    const { fileId } = deleteModal;
    setDeletingId(fileId);
    
    try {
      await axios.delete(`http://localhost:5001/api/files/${fileId}`, {
        withCredentials: true,
      });
      toast.success('File deleted successfully!');
      fetchFiles(currentPage);
      closeDeleteModal();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to delete file: ${error.response?.data?.message || error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getFileIcon = (format: string) => {
    if (format === 'application/pdf' || format === 'pdf') return faFilePdf;
    if (format === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || format === 'docx') return faFileWord;
    if (format.startsWith('image/')) return faFileImage;
    return faFile;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <ClipLoader size={50} color="#6366f1" />
        <p>Loading your files...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>File Manager</h2>
        <div className={styles.statsContainer}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{totalFiles}</span>
            <span className={styles.statLabel}>Total Files</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{currentPage}</span>
            <span className={styles.statLabel}>Current Page</span>
          </div>
        </div>
      </div>

      {files.length === 0 ? (
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon={faFile} className={styles.emptyIcon} />
          <h3>No files uploaded yet</h3>
          <p>Start by uploading your first file to see it here.</p>
        </div>
      ) : (
        <>
          <div className={styles.fileGrid}>
            {files.map((file) => (
              <div key={file._id} className={styles.fileCard}>
                <div className={styles.filePreview}>
                  {file.format.startsWith('image/') ? (
                    <div className={styles.imageContainer}>
                      <img src={file.url} alt={file.filename} className={styles.previewImage} />
                      <div className={styles.imageOverlay}>
                        <FontAwesomeIcon icon={faEye} />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fileIconContainer}>
                      <FontAwesomeIcon 
                        icon={getFileIcon(file.format)} 
                        className={styles.fileIcon}
                      />
                    </div>
                  )}
                </div>

                <div className={styles.fileInfo}>
                  <h4 className={styles.fileName} title={file.filename}>
                    {file.filename}
                  </h4>
                  <div className={styles.fileMetadata}>
                    <span className={styles.fileSize}>
                      {formatFileSize(file.size)}
                    </span>
                    <span className={styles.fileDate}>
                      {new Date(file.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div className={styles.fileActions}>
                  <button
                    className={`${styles.actionButton} ${styles.downloadButton}`}
                    onClick={() => handleDownload(file.url, file.filename, file._id)}
                    disabled={!!downloadingId}
                    title="Download file"
                  >
                    {downloadingId === file._id ? (
                      <ClipLoader size={16} color="#fff" />
                    ) : (
                      <FontAwesomeIcon icon={faDownload} />
                    )}
                  </button>
                  
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => openDeleteModal(file._id, file.filename)}
                    disabled={!!deletingId}
                    title="Delete file"
                  >
                    {deletingId === file._id ? (
                      <ClipLoader size={16} color="#fff" />
                    ) : (
                      <FontAwesomeIcon icon={faTrash} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={`${styles.paginationButton} ${currentPage === 1 ? styles.disabled : ''}`}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <div className={styles.pageInfo}>
                <span className={styles.pageNumbers}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        className={`${styles.pageNumber} ${currentPage === pageNum ? styles.active : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </span>
                <span className={styles.pageText}>
                  of {totalPages} pages
                </span>
              </div>

              <button
                className={`${styles.paginationButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        fileName={deleteModal.fileName}
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
        isDeleting={!!deletingId}
      />
    </div>
  );
};

export default FileList;