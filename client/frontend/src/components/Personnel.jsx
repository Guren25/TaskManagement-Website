import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Personnel.css';
import SideNav from './SideNav';

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
        role: 'client'
    });
    const [isFilterExpanded, setIsFilterExpanded] = useState(true);

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
                await axios.post('/api/users/register', userData);
                
                alert(`User created successfully! Temporary password: ${tempPassword}\nUser will be prompted to change it on first login.`);
            }
            setIsModalOpen(false);
            setEditingUser(null);
            resetForm();
            fetchPersonnel();
        } catch (error) {
            console.error('Error saving user:', error);
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
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await axios.delete(`/api/users/${userId}`);
                fetchPersonnel();
            } catch (error) {
                console.error('Error deleting user:', error);
            }
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
            password: ''
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            firstname: '',
            lastname: '',
            middlename: '',
            email: '',
            role: 'client'
        });
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

                <div className="personnel-container">
                    <div className="personnel-content-wrapper">
                        <div className="filter-controls-row">
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

                        <div className="personnel-table">
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
                                        placeholder="Middle Name"
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
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                                        required
                                    >
                                        <option value="client">Client</option>
                                        <option value="engineer">Engineer</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="modal-actions">
                                    <button type="submit" className="submit-btn">
                                        {editingUser ? 'Update' : 'Add'} Personnel
                                    </button>
                                    <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Personnel;
