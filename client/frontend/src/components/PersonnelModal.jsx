import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PersonnelModal.css';

const PersonnelModal = ({ isOpen, onClose, personnelId, userRole }) => {
  const [personnelData, setPersonnelData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && personnelId) {
      fetchPersonnelData();
    }
    
    // Set user permissions based on role
    setIsAdmin(userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'administrator');
    setIsManager(userRole?.toLowerCase() === 'manager' || userRole?.toLowerCase() === 'project manager');
  }, [isOpen, personnelId, userRole]);

  const fetchPersonnelData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/users/${personnelId}`);
      setPersonnelData(response.data);
    } catch (err) {
      console.error('Error fetching personnel data:', err);
      setError('Failed to load personnel details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    // This would be implemented if we add editing functionality
    console.log('Edit personnel:', personnelId);
    // Would open edit form or redirect to edit page
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this personnel? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/users/${personnelId}`);
        onClose();
        // Optionally trigger a refresh of the personnel list
      } catch (err) {
        console.error('Error deleting personnel:', err);
        setError('Failed to delete personnel. Please try again.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="personnel-modal-overlay">
      <div className="personnel-modal">
        <div className="personnel-modal-header">
          <h2 className="personnel-modal-title">Personnel Details</h2>
          <button className="personnel-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="personnel-modal-content">
          {isLoading ? (
            <div className="personnel-modal-loading">Loading personnel details...</div>
          ) : error ? (
            <div className="personnel-modal-error">{error}</div>
          ) : personnelData ? (
            <div className="personnel-details">
              <div className="personnel-detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">
                  {personnelData.firstname} {personnelData.middlename ? personnelData.middlename + ' ' : ''}
                  {personnelData.lastname}
                </span>
              </div>
              
              <div className="personnel-detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{personnelData.email}</span>
              </div>
              
              <div className="personnel-detail-row">
                <span className="detail-label">Role:</span>
                <span className="detail-value">{personnelData.role}</span>
              </div>
              
              <div className="personnel-detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{personnelData.phone ? personnelData.phone : 'Not provided'}</span>
              </div>
              
              {personnelData.skills && personnelData.skills.length > 0 && (
                <div className="personnel-detail-row">
                  <span className="detail-label">Skills:</span>
                  <span className="detail-value skills-list">
                    {personnelData.skills.join(', ')}
                  </span>
                </div>
              )}
              
              {personnelData.notes && (
                <div className="personnel-detail-row notes">
                  <span className="detail-label">Notes:</span>
                  <span className="detail-value">{personnelData.notes}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="personnel-modal-error">No personnel data found</div>
          )}
        </div>

        <div className="personnel-modal-footer">
          {/* Footer is now empty since we removed all buttons */}
        </div>
      </div>
    </div>
  );
};

export default PersonnelModal; 