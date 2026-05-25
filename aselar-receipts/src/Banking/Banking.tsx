import React, { useState, useEffect } from 'react';
import styles from './Banking.module.css';
import { useNavigate } from 'react-router-dom';
import { toast } from "react-toastify";

interface BankingProps {
    bankName?: string;
    accountNumber?: string;
    branchName?: string;
    accountName?: string;
    swiftCode?: string;
    accountType?: string;
}

const Banking: React.FC<BankingProps> = () => {
    const [bankingData, setBankingData] = useState<BankingProps>({
        bankName: '',
        accountNumber: '',
        branchName: '',
        accountName: '',
        swiftCode: '',
        accountType: 'checking',
    });

    const [loading, setLoading] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setIsModalOpen(true);
    }, []);

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBankingData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Submit banking details - Removed all client-side validations
    const submitBankingDetails = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setSubmitStatus(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/banking`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bankingData),
            });

            const result = await response.json();

            if (response.ok) {
                setSubmitStatus('success');
                toast.success("Banking details submitted successfully!");
                navigate('/inside-dashboard');

                // Reset form
                setBankingData({
                    bankName: '',
                    accountNumber: '',
                    branchName: '',
                    accountName: '',
                    swiftCode: '',
                    accountType: 'checking',
                });
            } else {
                setSubmitStatus('error');
                toast.error(result.message || "Failed to submit banking details.");
            }
        } catch (error) {
            console.error('Error submitting banking details:', error);
            setSubmitStatus('error');
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.bankingContainer}>
            <div className={styles.formWrapper}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Banking Details</h2>
                    <p className={styles.subtitle}>
                        Please provide your banking information. You can enter any details freely.
                    </p>
                </div>

                <form onSubmit={submitBankingDetails} className={styles.form}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label htmlFor="accountName" className={styles.label}>
                                Account Holder Name
                            </label>
                            <input
                                type="text"
                                id="accountName"
                                name="accountName"
                                value={bankingData.accountName || ''}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="Enter full name (any text allowed)"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="bankName" className={styles.label}>
                                Bank Name
                            </label>
                            <input
                                type="text"
                                id="bankName"
                                name="bankName"
                                value={bankingData.bankName || ''}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="Enter bank name"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="accountNumber" className={styles.label}>
                                Account Number
                            </label>
                            <input
                                type="text"                
                                id="accountNumber"
                                name="accountNumber"
                                value={bankingData.accountNumber || ''}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="Enter account number (any characters allowed)"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="branchName" className={styles.label}>
                                Branch Name
                            </label>
                            <input
                                type="text"
                                id="branchName"
                                name="branchName"
                                value={bankingData.branchName || ''}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="Enter branch name"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="swiftCode" className={styles.label}>
                                SWIFT Code
                            </label>
                            <input
                                type="text"
                                id="swiftCode"
                                name="swiftCode"
                                value={bankingData.swiftCode || ''}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="Enter SWIFT code (any format)"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="accountType" className={styles.label}>
                                Account Type
                            </label>
                            <select
                                id="accountType"
                                name="accountType"
                                value={bankingData.accountType || 'checking'}
                                onChange={handleInputChange}
                                className={styles.select}
                            >
                                <option value="checking">Checking</option>
                                <option value="savings">Savings</option>
                                <option value="business">Business</option>
                            </select>
                        </div>
                    </div>

                    {submitStatus === 'success' && (
                        <div className={styles.successMessage}>
                            <span className={styles.successIcon}>✓</span>
                            Banking details submitted successfully!
                        </div>
                    )}

                    {submitStatus === 'error' && (
                        <div className={styles.errorMessage}>
                            <span className={styles.errorIcon}>✗</span>
                            Error submitting banking details. Please try again.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`${styles.submitButton} ${loading ? styles.loading : ''}`}
                    >
                        {loading ? (
                            <>
                                <span className={styles.spinner}></span>
                                Submitting...
                            </>
                        ) : (
                            'Submit Banking Details'
                        )}
                    </button>
                </form>
            </div>

            {isModalOpen && (
                <>
                    <div 
                        className={styles.modalBackdrop} 
                        onClick={closeModal}
                    />
                    <div className={styles.modalContainer}>
                        <div className={styles.modalContent}>
                            <h3 className={styles.modalTitle}>Payment Options</h3>
                            <p className={styles.modalMessage}>
                                To our customers, you can replace orange money, my zaka, Smega or other relative information that can help you receive payment.
                            </p>
                            <button 
                                className={styles.modalCloseButton} 
                                onClick={closeModal}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Banking;