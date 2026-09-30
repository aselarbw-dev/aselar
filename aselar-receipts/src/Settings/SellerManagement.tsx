// SellerManagement.tsx
import React, { useCallback, useEffect, useState } from 'react';
import styles from './SellerManagement.module.css';
//import {toast} from 'react-toastify';
interface AuthorizedSeller {
  _id: string;
  name: string;
  active: boolean;
  isOwner: boolean;
}

const API_URL = `${import.meta.env.VITE_AUTH_SERVICE_URL}api/authorized-sellers`;

const request = async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
};

const SellerManagement: React.FC = () => {
  const [sellers, setSellers] = useState<AuthorizedSeller[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newName, setNewName] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const loadSellers = useCallback(async () => {
    try {
      const data = await request<AuthorizedSeller[]>(API_URL);
      setSellers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sellers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSellers();
  }, [loadSellers]);

  const showSuccess = (message: string) => {
    setError('');
    setSuccess(message);
    window.setTimeout(() => setSuccess(''), 3000);
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setError('Seller name is required.');
      return;
    }

    setAdding(true);
    setError('');
    try {
      await request<AuthorizedSeller>(API_URL, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setNewName('');
      showSuccess(`"${name}" added.`);
      await loadSellers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add seller');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (seller: AuthorizedSeller) => {
    setEditingId(seller._id);
    setEditName(seller.name);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (seller: AuthorizedSeller) => {
    const name = editName.trim();
    if (!name) {
      setError('Seller name cannot be empty.');
      return;
    }
    if (name === seller.name) {
      cancelEdit();
      return;
    }

    setBusyId(seller._id);
    setError('');
    try {
      await request<AuthorizedSeller>(`${API_URL}/${seller._id}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      cancelEdit();
      showSuccess('Seller renamed.');
      await loadSellers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename seller');
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (seller: AuthorizedSeller) => {
    setBusyId(seller._id);
    setError('');
    try {
      await request<AuthorizedSeller>(`${API_URL}/${seller._id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !seller.active }),
      });
      showSuccess(`${seller.name} ${seller.active ? 'deactivated' : 'activated'}.`);
      await loadSellers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update seller');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (seller: AuthorizedSeller) => {
    const confirmed = window.confirm(
      `Remove "${seller.name}"? They will no longer be able to log in as a seller.`
    );
    if (!confirmed) return;

    setBusyId(seller._id);
    setError('');
    try {
      await request<{ message: string }>(`${API_URL}/${seller._id}`, { method: 'DELETE' });
      showSuccess(`"${seller.name}" removed.`);
      await loadSellers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove seller');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Seller Management</h2>
      <p className={styles.subtitle}>
        Only the names listed here can log in as a seller. Names must be typed exactly as
        registered (capital letters don't matter).
      </p>

      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Full seller name"
          className={styles.input}
          disabled={adding}
        />
        <button type="submit" className={styles.addButton} disabled={adding}>
          {adding ? 'Adding...' : 'Add Seller'}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      {loading ? (
        <p className={styles.muted}>Loading sellers...</p>
      ) : sellers.length === 0 ? (
        <p className={styles.muted}>
          No sellers yet. The first name typed at login becomes the owner.
        </p>
      ) : (
        <ul className={styles.list}>
          {sellers.map((seller) => {
            const isEditing = editingId === seller._id;
            const isBusy = busyId === seller._id;

            return (
              <li
                key={seller._id}
                className={`${styles.row} ${!seller.active ? styles.rowInactive : ''}`}
              >
                <div className={styles.nameArea}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={styles.input}
                      disabled={isBusy}
                      autoFocus
                    />
                  ) : (
                    <span className={styles.name}>{seller.name}</span>
                  )}
                  {seller.isOwner && <span className={styles.ownerBadge}>Owner</span>}
                  {!seller.active && <span className={styles.inactiveBadge}>Inactive</span>}
                </div>

                <div className={styles.actions}>
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className={styles.saveButton}
                        onClick={() => saveEdit(seller)}
                        disabled={isBusy}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={cancelEdit}
                        disabled={isBusy}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => startEdit(seller)}
                        disabled={isBusy}
                      >
                        Rename
                      </button>
                      {!seller.isOwner && (
                        <>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => toggleActive(seller)}
                            disabled={isBusy}
                          >
                            {seller.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => handleDelete(seller)}
                            disabled={isBusy}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SellerManagement;