import React from 'react';
import './ConfirmationModal.css';

const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    message, 
    confirmText = 'OK',
    cancelText = 'Cancel'
}) => {
    if (!isOpen) return null;

    return (
        <div className="confirmation-modal-overlay" onClick={onClose}>
            <div className="confirmation-modal" onClick={e => e.stopPropagation()}>
                <div className="confirmation-modal-content">
                    <p className="confirmation-message">{message}</p>
                    <div className="confirmation-actions">
                        <button 
                            className="confirmation-cancel-btn" 
                            onClick={onClose}
                        >
                            {cancelText}
                        </button>
                        <button 
                            className="confirmation-confirm-btn" 
                            onClick={onConfirm}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal; 