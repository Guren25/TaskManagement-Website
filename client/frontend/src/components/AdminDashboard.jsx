import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import axios from 'axios';
import TaskModal from './TaskModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit'
  });
};
const AdminDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    location: '',
    assignedTo: '',
    startDate: '',
    endDate: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get('/api/tasks');
      const data = response.data;
      setTasks(data);
      setFilteredTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };
  const handleFilterChange = async (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);

    if (!value) {
      setFilteredTasks(tasks);
      return;
    }

    try {
      const response = await axios.get(`/api/tasks/filter/${filterType}/${value}`);
      const data = response.data;
      setFilteredTasks(data);
    } catch (error) {
      console.error('Error applying filter:', error);
    }
  };

  const prepareChartData = () => {
    const last30Days = [...Array(30)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const completedTasksByDate = tasks.reduce((acc, task) => {
      const date = new Date(task.UpdatedAt).toISOString().split('T')[0];
      if (task.Status === 'completed') {
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      labels: last30Days,
      datasets: [{
        label: 'Completed Tasks',
        data: last30Days.map(date => completedTasksByDate[date] || 0),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    };
  };

  const handleTaskCreated = (newTask) => {
    setTasks([...tasks, newTask]);
    setFilteredTasks([...filteredTasks, newTask]);
  };

  return (
    <div className="admin-dashboard p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add New Task
        </button>
      </div>
      
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />
      
      <div className="filters-section grid grid-cols-3 gap-4 mb-6">
        <select
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Filter by Status</option>
          <option value="not-started">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <select
          onChange={(e) => handleFilterChange('priority', e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Filter by Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <input
          type="text"
          placeholder="Filter by Location"
          onChange={(e) => handleFilterChange('location', e.target.value)}
          className="p-2 border rounded"
        />

        <input
          type="text"
          placeholder="Filter by Assignee"
          onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
          className="p-2 border rounded"
        />

        <input
          type="date"
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          className="p-2 border rounded"
        />
      </div>

      <div className="tasks-section mb-6">
        <h2 className="text-xl font-semibold mb-4">Tasks & Subtasks</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                < th className='px-4 py-2'>Date Created</th>
                <th className="px-4 py-2">Task Name</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Assigned To</th>
                <th className="px-4 py-2">Progress</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => (
                <React.Fragment key={task._id}>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2">{formatDate(task.CreatedAt)}</td>
                    <td className="px-4 py-2">{task.TaskName}</td>
                    <td className="px-4 py-2">{task.Status}</td>
                    <td className="px-4 py-2">{task.Priority}</td>
                    <td className="px-4 py-2">{task.Location}</td>
                    <td className="px-4 py-2">{task.AssignedTo}</td>
                    <td className="px-4 py-2">{task.percentage}%</td>
                  </tr>
                  {task.subtask.map(subtask => (
                    <tr key={subtask._id} className="bg-gray-100">
                      <td className="px-4 py-2 pl-8">↳ {subtask.TaskName}</td>
                      <td className="px-4 py-2">{subtask.Status}</td>
                      <td className="px-4 py-2">{subtask.Priority}</td>
                      <td className="px-4 py-2">-</td>
                      <td className="px-4 py-2">{subtask.AssignedTo}</td>
                      <td className="px-4 py-2">-</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="graph-section">
        <h2 className="text-xl font-semibold mb-4">Task Completion Trends</h2>
        <div className="h-[400px]">
          <Line data={prepareChartData()} options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1
                }
              }
            }
          }} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 