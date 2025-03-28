import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Personnel.css';
import SideNav from './SideNav';
import ConfirmationModal from './ConfirmationModal';

const Personnel = () => {
    const [personnel, setPersonnel] = useState([]);
    const [filters, setFilters] = useState({ role: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        middlename: '',
        email: '',
        password: '',
        phone: '',
        role: 'client',
        status: 'active'
    });
    const [isFilterExpanded, setIsFilterExpanded] = useState(true);
    const [notification, setNotification] = useState({ show: false, message: '' });
    const [formErrors, setFormErrors] = useState({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [userToVerify, setUserToVerify] = useState(null);

    useEffect(() => {
        fetchPersonnel();
    }, [filters]);

    const fetchPersonnel = async () => {
        try {
            const response = await axios.get('/api/users');
            let filteredUsers = response.data;
            
            if (filters.role) {
                filteredUsers = filteredUsers.filter(user => user.role === filters.role);
            }
            
            setPersonnel(filteredUsers);
        } catch (error) {
            console.error('Error fetching personnel:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                const { password, ...updateData } = formData;
                await axios.put(`/api/users/${editingUser._id}`, updateData);
            } else {
                const tempPassword = generateTemporaryPassword();
                const userData = {
                    ...formData,
                    password: tempPassword,
                    isTemporaryPassword: true
                };
                
                const response = await axios.post('/api/users/register', userData);
                showNotification(response.data.message);
                setIsModalOpen(false);
                setEditingUser(null);
                resetForm();
                fetchPersonnel();
            }
        } catch (error) {
            if (error.response?.data?.message) {
                if (error.response.data.message.includes('email')) {
                    setFormErrors({ email: 'This email is already registered' });
                } else {
                    setFormErrors({ general: error.response.data.message });
                }
            } else {
                setFormErrors({ general: 'An error occurred. Please try again.' });
            }
        }
    };

    const generateTemporaryPassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const handleDelete = async (userId) => {
        setUserToDelete(userId);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`/api/users/${userToDelete}`);
            fetchPersonnel();
            setShowDeleteModal(false);
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            firstname: user.firstname,
            lastname: user.lastname,
            middlename: user.middlename || '',
            email: user.email,
            role: user.role,
            phone: user.phone || '',
            password: '',
            status: user.status
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            firstname: '',
            lastname: '',
            middlename: '',
            email: '',
            role: 'client',
            phone: '',
            status: 'active'
        });
    };

    const showNotification = (message) => {
        setNotification({ show: true, message });
        setTimeout(() => {
            setNotification({ show: false, message: '' });
        }, 3000);
    };

    const handleSendVerification = async (user) => {
        try {
            await axios.post(`/api/users/${user._id}/send-verification`);
            showNotification('Verification email sent successfully');
            setShowVerificationModal(false);
        } catch (error) {
            setFormErrors({ general: 'Failed to send verification email' });
        }
    };

    return (
        <div className="admin-layout">
            <SideNav />
            <div className="admin-dashboard">
                <div className="dashboard-header">
                    <div>
                        <h1 className="dashboard-title">Team Management</h1>
                    </div>
                </div>

                <div>
                    <div className="personnel-controls">
                        <select 
                            className="personnel-select"
                            value={filters.role}
                            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                        >
                            <option value="">All Roles</option>
                            <option value="client">Client</option>
                            <option value="engineer">Engineer</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                        </select>
                        
                        <button 
                            className="add-personnel-btn" 
                            onClick={() => {
                                resetForm();
                                setEditingUser(null);
                                setIsModalOpen(true);
                            }}
                        >
                            Add Personnel
                        </button>
                    </div>

                    <div className="personnel-container">
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {personnel.map(user => (
                                        <tr key={user._id}>
                                            <td>{user.firstname} {user.middlename} {user.lastname}</td>
                                            <td>{user.email}</td>
                                            <td>
                                                <span className={`role-badge ${user.role}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button 
                                                        className="edit-btn"
                                                        onClick={() => handleEdit(user)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        className="delete-btn"
                                                        onClick={() => handleDelete(user._id)}
                                                    >
                                                        Delete
                                                    </button>
                                                    <button
                                                        className="view-btn"
                                                        onClick={() => handleView(user)}
                                                    >
                                                        Deactivate
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {isModalOpen && (
                    <div className="modal">
                        <div className="modal-content">
                            <h3>{editingUser ? 'Edit Personnel' : 'Add New Personnel'}</h3>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={formData.firstname}
                                        onChange={(e) => setFormData({...formData, firstname: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <input
                                        type="text"
                                        placeholder="Middle Name (Optional)"
                                        value={formData.middlename}
                                        onChange={(e) => setFormData({...formData, middlename: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={formData.lastname}
                                        onChange={(e) => setFormData({...formData, lastname: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={formData.email}
                                        onChange={(e) => {
                                            setFormData({...formData, email: e.target.value});
                                            setFormErrors({...formErrors, email: ''});
                                        }}
                                        className={formErrors.email ? 'error' : ''}
                                        required
                                    />
                                    {formErrors.email && <div className="form-error">{formErrors.email}</div>}
                                </div>
                                <div className="form-group">
                                    <input
                                        type="tel"
                                        placeholder="Phone Number"
                                        value={formData.phone || ''}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                                        required
                                    >
                                        <option value="" disabled>Select Role</option>
                                        <option value="client">Client</option>
                                        <option value="engineer">Engineer</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="submit-btn">
                                        {editingUser ? 'Update' : 'Add'} Personnel
                                    </button>
                                </div>
                            </form>
                            {formErrors.general && (
                                <div className="form-error" style={{ marginBottom: '1rem' }}>
                                    {formErrors.general}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {notification.show && (
                    <div className="notification">
                        <div className="notification-message">
                            {notification.message}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationModal 
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                message="Are you sure you want to delete this user?"
                confirmText="Delete"
                cancelText="Cancel"
            />

            <ConfirmationModal 
                isOpen={showVerificationModal}
                onClose={() => setShowVerificationModal(false)}
                onConfirm={() => handleSendVerification(userToVerify)}
                message="Would you like to send a verification email to this user?"
                confirmText="Send Email"
                cancelText="Cancel"
            />
        </div>
    );
};

export default Personnel;
