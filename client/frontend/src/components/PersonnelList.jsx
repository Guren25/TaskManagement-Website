import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PersonnelModal from './PersonnelModal';
import './PersonnelList.css';

const PersonnelList = () => {
  const [personnel, setPersonnel] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    fetchPersonnel();
    getCurrentUser();
  }, []);
  
  const getCurrentUser = () => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setCurrentUser(userData);
      
      // Check if user is admin or manager
      const userRole = userData.role?.toLowerCase();
      setIsAdmin(userRole === 'admin' || userRole === 'administrator');
      setIsManager(userRole === 'manager' || userRole === 'project manager');
    }
  };
  
  const fetchPersonnel = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/users');
      setPersonnel(response.data);
    } catch (err) {
      console.error('Error fetching personnel:', err);
      setError('Failed to load personnel. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleView = (person) => {
    setSelectedPersonnel(person);
    setIsModalOpen(true);
  };
  
  const handleAdd = () => {
    // This would be implemented to add new personnel
    console.log('Add new personnel');
    // Would open a form to add new personnel
  };
  
  const handleEdit = (person) => {
    // This would be implemented to edit personnel
    console.log('Edit personnel:', person._id);
    // Would open a form to edit personnel
  };
  
  const handleDelete = async (person) => {
    if (window.confirm(`Are you sure you want to delete ${person.firstname} ${person.lastname}?`)) {
      try {
        await axios.delete(`/api/users/${person._id}`);
        // Refresh the personnel list
        fetchPersonnel();
      } catch (err) {
        console.error('Error deleting personnel:', err);
        setError('Failed to delete personnel. Please try again.');
      }
    }
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPersonnel(null);
  };
  
  return (
    <div className="personnel-list-container">
      <div className="personnel-header">
        <h2 className="personnel-title">Personnel Management</h2>
        
        {/* Only admin and manager can add new personnel */}
        {(isAdmin || isManager) && (
          <button 
            className="personnel-add-btn" 
            onClick={handleAdd}
          >
            Add New Personnel
          </button>
        )}
      </div>
      
      {isLoading ? (
        <div className="personnel-loading">Loading personnel...</div>
      ) : error ? (
        <div className="personnel-error">{error}</div>
      ) : personnel.length > 0 ? (
        <div className="personnel-table-container">
          <table className="personnel-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Department</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {personnel.map(person => (
                <tr key={person._id}>
                  <td>{person.firstname} {person.lastname}</td>
                  <td>{person.role}</td>
                  <td>{person.email}</td>
                  <td>{person.department || 'Not assigned'}</td>
                  <td className="personnel-actions">
                    {/* Anyone can view */}
                    <button 
                      className="action-btn view-btn" 
                      onClick={() => handleView(person)}
                      title="View details"
                    >
                      View
                    </button>
                    
                    {/* Only admin can edit */}
                    {isAdmin && (
                      <button 
                        className="action-btn edit-btn" 
                        onClick={() => handleEdit(person)}
                        title="Edit personnel"
                      >
                        Edit
                      </button>
                    )}
                    
                    {/* Only admin can delete */}
                    {isAdmin && (
                      <button 
                        className="action-btn delete-btn" 
                        onClick={() => handleDelete(person)}
                        title="Delete personnel"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="personnel-empty">No personnel found</div>
      )}
      
      {/* Personnel detail modal */}
      {isModalOpen && selectedPersonnel && (
        <PersonnelModal 
          isOpen={isModalOpen}
          onClose={closeModal}
          personnelId={selectedPersonnel._id}
          userRole={currentUser?.role}
        />
      )}
    </div>
  );
};

export default PersonnelList; 