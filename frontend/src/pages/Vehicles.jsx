import { useState, useEffect } from 'react';
import axios from '../utils/api';
import { Car, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useForm } from 'react-hook-form';

const Vehicles = () => {
    const [expenses, setExpenses] = useState([]);
    const [aggregations, setAggregations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [expRes, aggRes] = await Promise.all([
                axios.get('/api/expenses'),
                axios.get('/api/expenses/vehicle-aggregations')
            ]);
            setExpenses(expRes.data.data);
            setAggregations(aggRes.data.data);
        } catch (error) {
            console.error('Error fetching vehicle data', error);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data) => {
        try {
            await axios.post('/api/expenses', data);
            fetchData();
            closeModal();
        } catch (error) {
            console.error('Error adding expense', error);
            alert('Failed to add expense');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        try {
            await axios.delete(`/api/expenses/${id}`);
            fetchData();
        } catch (error) {
            console.error('Error deleting expense', error);
        }
    };

    const openModal = () => {
        reset({
            date: new Date().toISOString().split('T')[0],
            category: 'Fuel',
            amount: '',
            vehicleNumber: '',
            description: '',
            paymentMode: 'Cash',
            referenceNumber: ''
        });
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">Vehicle Operations</h1>
                    <p className="text-sm text-gray-500">Track expenses and monitor vehicle-wise profitability.</p>
                </div>
                <button onClick={openModal} className="btn-primary flex items-center">
                    <Plus size={18} className="mr-2" />
                    Record Expense
                </button>
            </div>

            {/* Vehicle Profitability Aggregation Panel */}
            <div className="card">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                    <Car size={20} className="mr-2 text-primary-600" /> Vehicle-Wise Income Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <p className="text-sm text-gray-500">Loading aggregates...</p>
                    ) : aggregations.length === 0 ? (
                        <p className="text-sm text-gray-400">No vehicles tracked yet. Add expenses or link vehicles to invoices to see aggregates.</p>
                    ) : (
                        aggregations.map((v, i) => (
                            <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-5 flex flex-col justify-between">
                                <div className="text-xl font-bold text-gray-900 mb-3">{v.vehicleNumber}</div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total Income:</span>
                                        <span className="font-semibold text-green-600">₹{v.totalIncome.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total Expense:</span>
                                        <span className="font-semibold text-red-500">₹{v.totalExpense.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                                        <span className="text-gray-700 font-medium">Net Profit:</span>
                                        <span className={`font-bold flex items-center ${v.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                            {v.profit >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                                            ₹{Math.abs(v.profit).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Expenses List */}
            <div className="card">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Recent Expenses</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-left">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Amount (₹)</th>
                                <th className="px-6 py-3 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
                            ) : expenses.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">No expenses recorded.</td></tr>
                            ) : (
                                expenses.map(E => (
                                    <tr key={E._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(E.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {E.vehicleNumber || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">{E.category}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs cursor-pointer" title={E.description}>
                                            {E.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-500 text-right">
                                            {E.amount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button onClick={() => handleDelete(E._id)} className="text-red-400 hover:text-red-600 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Record Expense Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={closeModal}>
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 pb-3 mb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Record Vehicle Expense</h3>
                            </div>
                            <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Vehicle Number *</label>
                                    <input type="text" {...register('vehicleNumber', { required: true })} className="mt-1 input-field uppercase" placeholder="e.g. MH12AB1234" />
                                    {errors.vehicleNumber && <span className="text-xs text-red-500">Required</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Category *</label>
                                    <select {...register('category', { required: true })} className="mt-1 input-field">
                                        <option value="Fuel">Fuel</option>
                                        <option value="Toll">Toll</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Driver Salary">Driver Salary</option>
                                        <option value="Office">Office / Adm</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Amount (₹) *</label>
                                        <input type="number" step="0.01" {...register('amount', { required: true })} className="mt-1 input-field font-bold text-red-600" />
                                        {errors.amount && <span className="text-xs text-red-500">Required</span>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Date *</label>
                                        <input type="date" {...register('date', { required: true })} className="mt-1 input-field" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                                    <select {...register('paymentMode')} className="mt-1 input-field">
                                        <option value="Cash">Cash</option>
                                        <option value="Bank">Bank Transfer</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Credit">Credit / Account</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Description *</label>
                                    <textarea {...register('description', { required: true })} className="mt-1 input-field resize-none h-20" placeholder="e.g. 50L Diesel at BPCL..."></textarea>
                                    {errors.description && <span className="text-xs text-red-500">Required</span>}
                                </div>

                                <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                                    <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                                    <button type="submit" className="btn-primary">Save Expense</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Vehicles;
