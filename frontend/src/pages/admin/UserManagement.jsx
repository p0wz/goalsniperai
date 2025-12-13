import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout';
import { Card, Badge, Button, Modal, Input, Spinner } from '../../components/ui';
import useApi from '../../hooks/useApi';

const UserManagement = () => {
    const { get, put, del } = useApi();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [editPlan, setEditPlan] = useState('free');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        const result = await get('/api/admin/users');
        if (result.success) {
            setUsers(result.data.users);
        }
        setLoading(false);
    };

    const handleUpdatePlan = async () => {
        if (!editModal.user) return;

        const result = await put(`/api/admin/users/${editModal.user.id}/plan`, { plan: editPlan });
        if (result.success) {
            setUsers(users.map(u => u.id === editModal.user.id ? { ...u, plan: editPlan } : u));
            setEditModal({ open: false, user: null });
        }
    };

    const handleDelete = async (userId) => {
        if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;

        const result = await del(`/api/admin/users/${userId}`);
        if (result.success) {
            setUsers(users.filter(u => u.id !== userId));
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const getPlanBadge = (plan) => {
        switch (plan) {
            case 'premium': return <Badge variant="premium">Premium</Badge>;
            case 'pro': return <Badge variant="warning">Pro</Badge>;
            default: return <Badge>Free</Badge>;
        }
    };

    return (
        <DashboardLayout title="Kullanıcı Yönetimi">
            {/* Search */}
            <div className="flex items-center justify-between mb-6">
                <Input
                    placeholder="İsim veya email ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="!w-72"
                    icon="🔍"
                />
                <Badge variant="info">{users.length} kullanıcı</Badge>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Spinner size="lg" />
                </div>
            )}

            {/* Table */}
            {!loading && (
                <div className="table-container bg-[var(--bg-card)]">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Kullanıcı</th>
                                <th>Plan</th>
                                <th>Kayıt</th>
                                <th>Son Giriş</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--accent-green)]/20 flex items-center justify-center">
                                                <span className="text-[var(--accent-green)] font-bold text-sm">
                                                    {user.name?.charAt(0).toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            {getPlanBadge(user.plan)}
                                            {user.role === 'admin' && <Badge variant="danger">Admin</Badge>}
                                        </div>
                                    </td>
                                    <td className="text-sm text-[var(--text-secondary)]">
                                        {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="text-sm text-[var(--text-secondary)]">
                                        {user.last_login ? new Date(user.last_login).toLocaleDateString('tr-TR') : 'Hiç'}
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditModal({ open: true, user });
                                                    setEditPlan(user.plan);
                                                }}
                                            >
                                                Düzenle
                                            </Button>
                                            {user.role !== 'admin' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(user.id)}
                                                    className="!text-[var(--accent-red)]"
                                                >
                                                    Sil
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Modal */}
            <Modal
                isOpen={editModal.open}
                onClose={() => setEditModal({ open: false, user: null })}
                title="Kullanıcı Planını Düzenle"
            >
                <div className="space-y-4">
                    <p className="text-[var(--text-secondary)]">
                        {editModal.user?.name} ({editModal.user?.email})
                    </p>

                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-2">Plan</label>
                        <select
                            value={editPlan}
                            onChange={(e) => setEditPlan(e.target.value)}
                            className="input"
                        >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="premium">Premium</option>
                        </select>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setEditModal({ open: false, user: null })}>
                            İptal
                        </Button>
                        <Button variant="primary" onClick={handleUpdatePlan}>
                            Kaydet
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default UserManagement;
