'use client';

import { useState } from 'react';
import { SubFormula } from '@/lib/types';
import { ConfirmDialog } from './ConfirmDialog';

interface SubFormulaManagerProps {
  subFormulas: SubFormula[];
  onChange: (subFormulas: SubFormula[]) => void;
}

export function SubFormulaManager({ subFormulas, onChange }: SubFormulaManagerProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSubFormula, setEditingSubFormula] = useState<SubFormula | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; subFormula: SubFormula | null }>({
    open: false,
    subFormula: null,
  });

  const [form, setForm] = useState({
    name: '',
    englishFormula: '',
    chineseFormula: '',
  });

  const handleAdd = () => {
    setEditingSubFormula(null);
    setForm({ name: '', englishFormula: '', chineseFormula: '', englishVars: '', chineseVars: '' });
    setIsAddModalOpen(true);
  };

  const handleEdit = (subFormula: SubFormula) => {
    setEditingSubFormula(subFormula);
    setForm({
      name: subFormula.name,
      englishFormula: subFormula.englishFormula,
      chineseFormula: subFormula.chineseFormula,
    });
    setIsAddModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.englishFormula.trim() || !form.chineseFormula.trim()) {
      alert('请填写所有必填字段');
      return;
    }

    const newSubFormula: SubFormula = {
      id: editingSubFormula?.id || `sub_${Date.now()}`,
      name: form.name.trim(),
      englishFormula: form.englishFormula.trim(),
      chineseFormula: form.chineseFormula.trim(),
    };

    if (editingSubFormula) {
      onChange(subFormulas.map(sf => sf.id === editingSubFormula.id ? newSubFormula : sf));
    } else {
      onChange([...subFormulas, newSubFormula]);
    }

    setIsAddModalOpen(false);
    setForm({ name: '', englishFormula: '', chineseFormula: '', englishVars: '', chineseVars: '' });
  };

  const handleDelete = (subFormula: SubFormula) => {
    setDeleteConfirm({ open: true, subFormula });
  };

  const confirmDelete = () => {
    if (deleteConfirm.subFormula) {
      onChange(subFormulas.filter(sf => sf.id !== deleteConfirm.subFormula!.id));
    }
    setDeleteConfirm({ open: false, subFormula: null });
  };

  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">子公式管理</h4>
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          + 添加子公式
        </button>
      </div>

      {subFormulas.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">暂无子公式</p>
      ) : (
        <div className="space-y-2">
          {subFormulas.map((subFormula) => (
            <div
              key={subFormula.id}
              className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-gray-800 mb-1">{subFormula.name}</h5>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <div><span className="font-medium">英:</span> <code className="bg-gray-100 px-1.5 py-0.5 rounded">{subFormula.englishFormula}</code></div>
                    <div><span className="font-medium">中:</span> <code className="bg-gray-100 px-1.5 py-0.5 rounded">{subFormula.chineseFormula}</code></div>
                  </div>
                </div>
                <div className="flex gap-1 ml-3">
                  <button
                    onClick={() => handleEdit(subFormula)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(subFormula)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 添加/编辑模态框 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">{editingSubFormula ? '编辑子公式' : '添加子公式'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">子公式名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：计算折扣"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">英文公式</label>
                <input
                  type="text"
                  value={form.englishFormula}
                  onChange={(e) => setForm({ ...form, englishFormula: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="例如：price * rate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">中文公式</label>
                <input
                  type="text"
                  value={form.chineseFormula}
                  onChange={(e) => setForm({ ...form, chineseFormula: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="例如：价格 * 折扣率"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title="删除子公式"
        message={`确定删除子公式"${deleteConfirm.subFormula?.name}"吗？`}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, subFormula: null })}
      />
    </div>
  );
}
