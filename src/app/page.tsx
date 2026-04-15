'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { FormulaReferenceSelector } from '@/components/FormulaReferenceSelector';
import { SubFormulaManager } from '@/components/SubFormulaManager';
import { GroupSelector } from '@/components/GroupSelector';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { UnifiedMenuButton } from '@/components/UnifiedMenuButton';
import { SheetTabs } from '@/components/SheetTabs';
import { FormulaSpreadsheet } from '@/components/FormulaSpreadsheet';
import { FormulaGroup, Formula, SubFormula } from '@/lib/types';
import { loadData, saveData, loadColumnHeaders, createGroup, createFormula } from '@/lib/storage';
import { downloadExportData, importFromFile, importFromUrl } from '@/lib/importExport';

// Lazy load modals
const FormulaDetailModal = dynamic(
  () => import('@/components/FormulaDetailModal').then(mod => ({ 
    default: mod.FormulaDetailModal 
  })),
  { ssr: false }
);

const SortModal = dynamic(
  () => import('@/components/SortModal').then(mod => ({ 
    default: mod.SortModal 
  })),
  { ssr: false }
);

const CloudSyncModal = dynamic(
  () => import('@/components/CloudSyncModal').then(mod => ({ 
    default: mod.CloudSyncModal 
  })),
  { ssr: false }
);

function HomeContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlFormulaId = searchParams.get('formula');
  const urlCloudEndpoint = searchParams.get('cloud');

  const [groups, setGroups] = useState<FormulaGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedFormulaId, setSelectedFormulaId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // 初始加载状态
  const [columnHeaders, setColumnHeaders] = useState<{
    level1?: string;
    level2?: string;
    level3?: string;
    level4?: string;
    level5?: string;
    level6?: string;
    formula?: string;
  }>({});
  
  // Excel 视图模式 - 固定使用表格视图
  const [detailFormula, setDetailFormula] = useState<Formula | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [pendingDeleteFormulaId, setPendingDeleteFormulaId] = useState<string | null>(null);

  // 封装的 setSelectedFormulaId，自动更新 URL
  const handleSelectFormula = useCallback((formulaId: string | null) => {
    setSelectedFormulaId(formulaId);
  }, []);

  // 同步 selectedFormulaId 到 URL
  useEffect(() => {
    const currentParams = new URLSearchParams(window.location.search);
    const currentFormulaId = currentParams.get('formula');
    
    if (selectedFormulaId !== currentFormulaId) {
      if (selectedFormulaId) {
        currentParams.set('formula', selectedFormulaId);
        router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false });
      } else {
        currentParams.delete('formula');
        const newUrl = currentParams.toString() ? `${pathname}?${currentParams.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [selectedFormulaId, router, pathname]);

  // 封装的 setSelectedGroupId，清空 URL 参数
  const handleSelectGroup = useCallback((groupId: string | null) => {
    setSelectedGroupId(groupId);
    // 清空 URL 中的 formula 参数
    const params = new URLSearchParams(window.location.search);
    params.delete('formula');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl, { scroll: false });
  }, [router, pathname]);

  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isCreateFormulaModalOpen, setIsCreateFormulaModalOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  const [importError, setImportError] = useState<string>('');
  const [showUrlImportModal, setShowUrlImportModal] = useState(false);
  const [showColumnHeadersModal, setShowColumnHeadersModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: 'danger' | 'default';
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupParentId, setNewGroupParentId] = useState<string | null>(null);
  const [editingColumnHeaders, setEditingColumnHeaders] = useState<{
    level1: string;
    level2: string;
    level3: string;
    level4: string;
    level5: string;
    level6: string;
  }>({ level1: '', level2: '', level3: '', level4: '', level5: '', level6: '' });
  const [formulaForm, setFormulaForm] = useState<{
    name: string;
    englishFormula: string;
    chineseFormula: string;
    description: string;
    variableFormulaMapping: Record<string, string>;
    subFormulas: SubFormula[];
    groupId: string | null;
    parentGroupId: string | null;
    level1Group: string;
    level2Group: string;
    level3Group: string;
    level4Group: string;
    level5Group: string;
    level6Group: string;
  }>({
    name: '',
    englishFormula: '',
    chineseFormula: '',
    description: '',
    variableFormulaMapping: {},
    subFormulas: [],
    groupId: null,
    parentGroupId: null,
    level1Group: '',
    level2Group: '',
    level3Group: '',
    level4Group: '',
    level5Group: '',
    level6Group: '',
  });

  // 监听来自编辑器窗口的更新消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FORMULA_UPDATED') {
        // 更新本地数据
        if (event.data.groups) {
          setGroups(event.data.groups);
          saveData(event.data.groups);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 监听 isLoading 变化（临时调试，后续可移除）
  useEffect(() => {
    // console.log('[STATE] isLoading changed to:', isLoading);
  }, [isLoading]);

  useEffect(() => {
    const savedGroups = loadData();
    const savedHeaders = loadColumnHeaders();
    
    // 使用 setTimeout 确保所有状态更新在下一个事件循环中执行
    setTimeout(() => {
      // 确保数据加载后再设置状态
      if (savedGroups && savedGroups.length > 0) {
        setGroups(savedGroups);
        if (savedHeaders) {
          setColumnHeaders(savedHeaders);
        }

        // 恢复缓存的分组选择
        const cachedSelectedGroupId = localStorage.getItem('selectedGroupId');
        const cachedSidebarCollapsed = localStorage.getItem('sidebarCollapsed');
        
        if (cachedSelectedGroupId) {
          setSelectedGroupId(cachedSelectedGroupId);
        } else if (savedGroups.length > 0) {
          setSelectedGroupId(savedGroups[0].id);
        }
        
        if (cachedSidebarCollapsed) {
          setSidebarCollapsed(cachedSidebarCollapsed === 'true');
        }

        // 根据 URL 参数展开指定公式
        if (urlFormulaId) {
          for (const group of savedGroups) {
            const formula = group.formulas.find(f => f.id === urlFormulaId);
            if (formula) {
              setSelectedGroupId(group.id);
              setSelectedFormulaId(urlFormulaId);
              break;
            }
          }
        }
      }

      // 处理 cloud query 参数
      if (urlCloudEndpoint) {
        handleCloudQueryBind(urlCloudEndpoint).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  // 处理 cloud query 参数绑定
  const handleCloudQueryBind = async (endpoint: string) => {
    if (cloudLoading) {
      console.log('[Cloud] Already loading, skipping');
      return;
    }
    
    setCloudLoading(true);
    const startTime = Date.now();
    
    try {
      // 保存配置到 localStorage
      const cloudConfig = {
        endpoint: endpoint.trim(),
        apiKey: undefined,
        namespaceId: undefined,
      };
      localStorage.setItem('formulaMapper_cloudConfig', JSON.stringify(cloudConfig));
      
      // 标记为已通过 query 绑定
      localStorage.setItem('cloudQueryBound', 'true');
      
      // 从云端加载数据
      const { CloudflareStorageProvider, StorageProviderType } = await import('@/lib/cloud');
      const provider = new CloudflareStorageProvider({
        type: StorageProviderType.CLOUDFLARE,
        endpoint: endpoint.trim(),
      });
      
      const result = await provider.load('formula-data');
      
      // 确保 loading 至少显示 1 秒
      const elapsed = Date.now() - startTime;
      if (elapsed < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
      }
      
      if (result.success && result.data) {
        setGroups(result.data.groups);
        if (result.data.columnHeaders) {
          setColumnHeaders(result.data.columnHeaders);
        }
        saveData(result.data.groups, result.data.columnHeaders);
        
        // 选中第一个分组
        const firstGroupId = result.data.groups.length > 0 ? result.data.groups[0].id : null;
        setSelectedGroupId(firstGroupId);
        
        setSelectedFormulaId(null);
        toast.success('已从云端加载数据');
        
        // 清理 URL 参数
        const params = new URLSearchParams(window.location.search);
        params.delete('cloud');
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.push(newUrl, { scroll: false });
      } else {
        toast.error(result.error || '从云端加载数据失败');
        
        // 加载失败时也要清理 URL 参数
        const params = new URLSearchParams(window.location.search);
        params.delete('cloud');
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.push(newUrl, { scroll: false });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '从云端加载数据失败');
      
      // 错误时也要清理 URL 参数
      const params = new URLSearchParams(window.location.search);
      params.delete('cloud');
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.push(newUrl, { scroll: false });
    } finally {
      setCloudLoading(false);
    }
  };

  // 监听 URL 公式参数变化（用于处理浏览器前进/后退）
  useEffect(() => {
    if (urlFormulaId && urlFormulaId !== selectedFormulaId) {
      setSelectedFormulaId(urlFormulaId);
    } else if (!urlFormulaId && selectedFormulaId) {
      setSelectedFormulaId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFormulaId]); // 当 URL 公式参数变化时更新选中的公式

  // 缓存选中的分组和展开状态
  useEffect(() => {
    // 如果有 groups 但 selectedGroupId 为 null，自动选中第一个
    if (groups.length > 0 && selectedGroupId === null) {
      setSelectedGroupId(groups[0].id);
      return;
    }
    
    if (selectedGroupId) {
      localStorage.setItem('selectedGroupId', selectedGroupId);
    } else {
      localStorage.removeItem('selectedGroupId');
    }
  }, [selectedGroupId, groups]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // 获取分组路径
  const getGroupPath = (groupId: string): string => {
    const path: string[] = [];
    let currentGroup = groups.find(g => g.id === groupId);
    while (currentGroup) {
      path.unshift(currentGroup.name);
      if (currentGroup?.parentId) {
        currentGroup = groups.find(g => g.id === currentGroup?.parentId);
      } else {
        currentGroup = undefined;
      }
    }
    return path.join('/');
  };

  const handleCreateGroup = (parentId: string | null) => {
    // 如果明确传入 null,则创建顶级分组(用于 Sheet 标签)
    // 如果传入 undefined,则使用当前选中的分组作为父分组
    const finalParentId = parentId !== undefined ? parentId : selectedGroupId;
    console.log('准备创建分组:', { 
      passedParentId: parentId, 
      selectedGroupId, 
      finalParentId,
      willBeRoot: finalParentId === null 
    });
    setNewGroupName('');
    setNewGroupParentId(finalParentId);
    setIsCreateGroupModalOpen(true);
  };

  const handleSaveGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup = createGroup(newGroupName.trim(), newGroupParentId);
    const newGroups = [...groups, newGroup];
    
    console.log('创建分组:', {
      name: newGroup.name,
      parentId: newGroup.parentId,
      isRoot: newGroup.parentId === null,
      totalGroups: newGroups.length
    });
    
    setGroups(newGroups);
    saveData(newGroups);
    
    // 如果是顶级分组(parentId 为 null),自动选中新分组
    if (newGroupParentId === null) {
      setSelectedGroupId(newGroup.id);
      toast.success(`Sheet "${newGroup.name}" 已创建`);
    } else {
      toast.success(`子分组 "${newGroup.name}" 已创建`);
    }
    
    setNewGroupName('');
    setNewGroupParentId(null);
    setIsCreateGroupModalOpen(false);
  };

  const handleOpenColumnHeadersEditor = () => {
    setEditingColumnHeaders({
      level1: columnHeaders?.level1 || '',
      level2: columnHeaders?.level2 || '',
      level3: columnHeaders?.level3 || '',
      level4: columnHeaders?.level4 || '',
      level5: columnHeaders?.level5 || '',
      level6: columnHeaders?.level6 || '',
    });
    setShowColumnHeadersModal(true);
  };

  const handleSaveColumnHeaders = () => {
    const newHeaders = {
      level1: editingColumnHeaders.level1.trim() || undefined,
      level2: editingColumnHeaders.level2.trim() || undefined,
      level3: editingColumnHeaders.level3.trim() || undefined,
      level4: editingColumnHeaders.level4.trim() || undefined,
      level5: editingColumnHeaders.level5.trim() || undefined,
      level6: editingColumnHeaders.level6.trim() || undefined,
    };
    setColumnHeaders(newHeaders);
    saveData(groups, newHeaders);
    setShowColumnHeadersModal(false);
    toast.success('表头名称已更新');
  };

  // 处理表格列头直接编辑
  const handleColumnHeaderEdit = (columnId: string, newName: string) => {
    const headerKey = columnId.replace('Group', '') as keyof typeof columnHeaders;
    const newHeaders = { ...columnHeaders, [headerKey]: newName };
    setColumnHeaders(newHeaders);
    saveData(groups, newHeaders);
    toast.success(`列头 "${newName}" 已更新`);
  };

  const handleDeleteGroup = (groupId: string) => {
    // 删除分组及其所有子分组
    const toDelete = new Set<string>([groupId]);
    let changed = true;
    while (changed) {
      changed = false;
      groups.forEach(g => {
        if (g.parentId && toDelete.has(g.parentId) && !toDelete.has(g.id)) {
          toDelete.add(g.id);
          changed = true;
        }
      });
    }
    const newGroups = groups.filter((g) => !toDelete.has(g.id));
    setGroups(newGroups);
    saveData(newGroups);
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
    }
  };

  const handleEditGroup = (groupId: string, newName: string) => {
    const updatedGroups = groups.map((g) =>
      g.id === groupId ? { ...g, name: newName } : g
    );
    setGroups(updatedGroups);
    saveData(updatedGroups);
  };

  const handleCreateFormula = () => {
    const targetGroupId = formulaForm.groupId;
    if (!targetGroupId) {
      toast.error('请选择一个分组');
      return;
    }
    if (!formulaForm.name.trim() || !formulaForm.englishFormula.trim() || !formulaForm.chineseFormula.trim()) {
      toast.error('请填写所有字段');
      return;
    }
    const currentGroup = groups.find(g => g.id === targetGroupId);
    const isDuplicate = currentGroup?.formulas.some(
      f => f.name.toLowerCase() === formulaForm.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast.error('该分组下已存在同名公式，请使用不同的名称');
      return;
    }
    const newFormula = createFormula(
      formulaForm.name.trim(),
      formulaForm.englishFormula.trim(),
      formulaForm.chineseFormula.trim()
    );
    newFormula.description = formulaForm.description.trim();
    newFormula.variableFormulaMapping = formulaForm.variableFormulaMapping;
    newFormula.subFormulas = formulaForm.subFormulas;
    // 添加分组字段
    newFormula.level1Group = formulaForm.level1Group;
    newFormula.level2Group = formulaForm.level2Group;
    newFormula.level3Group = formulaForm.level3Group;
    newFormula.level4Group = formulaForm.level4Group;
    newFormula.level5Group = formulaForm.level5Group;
    newFormula.level6Group = formulaForm.level6Group;
    const updatedGroups = groups.map((g) => {
      if (g.id === targetGroupId) {
        return { ...g, formulas: [...g.formulas, newFormula] };
      }
      return g;
    });
    setGroups(updatedGroups);
    saveData(updatedGroups);
    setFormulaForm({ 
      name: '', 
      englishFormula: '', 
      chineseFormula: '', 
      description: '', 
      variableFormulaMapping: {}, 
      subFormulas: [], 
      groupId: null, 
      parentGroupId: null,
      level1Group: '',
      level2Group: '',
      level3Group: '',
      level4Group: '',
      level5Group: '',
      level6Group: '',
    });
    setIsCreateFormulaModalOpen(false);
  };

  const handleDeleteFormula = (formulaId: string) => {
    // 显示确认弹窗
    setPendingDeleteFormulaId(formulaId);
  };

  const confirmDeleteFormula = () => {
    if (!pendingDeleteFormulaId) return;
    
    const updatedGroups = groups.map((g) => ({
      ...g,
      formulas: g.formulas.filter((f) => f.id !== pendingDeleteFormulaId),
    }));
    setGroups(updatedGroups);
    saveData(updatedGroups);
    if (selectedFormulaId === pendingDeleteFormulaId) {
      handleSelectFormula(null);
    }
    setPendingDeleteFormulaId(null);
  };

  // Excel 视图相关处理函数
  const handleSpreadsheetRowClick = (formula: Formula) => {
    // 在新窗口中打开编辑器
    const editorUrl = `/formula-editor/${formula.id}`;
    window.open(editorUrl, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
  };

  const handleUpdateFormulaInSpreadsheet = (formulaId: string, updates: Partial<Formula>) => {
    const updatedGroups = groups.map((group) => ({
      ...group,
      formulas: group.formulas.map((f) =>
        f.id === formulaId ? { ...f, ...updates } : f
      ),
    }));
    setGroups(updatedGroups);
    saveData(updatedGroups);
  };

  // 批量更新多个公式
  const handleUpdateFormulasInSpreadsheet = (formulaIds: string[], updates: Partial<Formula>) => {
    const updatedGroups = groups.map((group) => ({
      ...group,
      formulas: group.formulas.map((f) =>
        formulaIds.includes(f.id) ? { ...f, ...updates } : f
      ),
    }));
    setGroups(updatedGroups);
    saveData(updatedGroups);
  };

  const handleAddFormulaToGroup = (groupId: string) => {
    // 创建一个空的公式对象，但不立即保存
    const newFormula: any = {
      id: '', // 空 ID 表示是新增模式
      name: '',
      englishFormula: '',
      chineseFormula: '',
      createdAt: Date.now(),
      variableFormulaMapping: {},
      subFormulas: [],
      level1Group: '',
      level2Group: '',
      level3Group: '',
      level4Group: '',
      level5Group: '',
      level6Group: '',
    };
    
    // 打开详情弹窗进行编辑
    setDetailFormula(newFormula);
    setIsDetailModalOpen(true);
  };

  const handleSaveFormulaDetail = (updatedFormula: Formula) => {
    // 验证必填字段
    if (!updatedFormula.englishFormula?.trim()) {
      toast.error('请填写英文公式');
      return;
    }
    
    if (!updatedFormula.chineseFormula?.trim()) {
      toast.error('请填写中文公式');
      return;
    }
    
    // 如果是新增模式（ID 为空），创建新公式
    if (!updatedFormula.id) {
      const newFormula: Formula = {
        ...updatedFormula,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      
      // 找到目标分组并添加公式
      const targetGroupId = selectedGroupId || groups[0]?.id;
      const updatedGroups = groups.map((group) => {
        if (group.id === targetGroupId) {
          // 找到与新公式 L1 相同的位置插入
          const newL1 = newFormula.level1Group || '';
          let insertIndex = group.formulas.length; // 默认追加到末尾
          
          // 如果有相同的 L1 分组，插入到该分组的末尾
          if (newL1) {
            for (let i = group.formulas.length - 1; i >= 0; i--) {
              if (group.formulas[i].level1Group === newL1) {
                insertIndex = i + 1;
                break;
              }
            }
          }
          
          const newFormulas = [...group.formulas];
          newFormulas.splice(insertIndex, 0, newFormula);
          
          return {
            ...group,
            formulas: newFormulas,
          };
        }
        return group;
      });
      
      setGroups(updatedGroups);
      saveData(updatedGroups);
    } else {
      // 否则是编辑模式，更新现有公式
      handleUpdateFormulaInSpreadsheet(updatedFormula.id, updatedFormula);
    }
  };

  const handleOpenSortModal = () => {
    setIsSortModalOpen(true);
  };

  const handleSaveSortOrder = (sortedGroups: string[][]) => {
    if (!selectedGroupId) return;
    
    const updatedGroups = groups.map((group) => {
      if (group.id === selectedGroupId) {
        const formulas = [...group.formulas];
        const sortedFormulas: Formula[] = [];
        
        // sortedGroups[0] 是 L1 排序
        // sortedGroups[1] 是 L2 排序
        // sortedGroups[2] 是 L3 排序
        // 以此类推...
        
        // 递归排序函数
        const sortByLevels = (level: number, parentPath: string[]) => {
          if (level >= sortedGroups.length) {
            // 已经处理完所有分组层级，添加匹配的公式
            const matched = formulas.filter(f => {
              return parentPath.every((pathPart, idx) => {
                const levelKey = `level${idx + 1}Group` as keyof Formula;
                return (f[levelKey] || '') === pathPart;
              });
            });
            sortedFormulas.push(...matched);
            return;
          }
          
          const currentLevelOrder = sortedGroups[level] || [];
          
          if (currentLevelOrder.length === 0) {
            // 当前层级没有排序，添加所有匹配的公式
            const matched = formulas.filter(f => {
              return parentPath.every((pathPart, idx) => {
                const levelKey = `level${idx + 1}Group` as keyof Formula;
                return (f[levelKey] || '') === pathPart;
              });
            });
            sortedFormulas.push(...matched);
            return;
          }
          
          // 按当前层级的排序顺序处理
          for (const currentValue of currentLevelOrder) {
            const newPath = [...parentPath, currentValue];
            sortByLevels(level + 1, newPath);
          }
          
          // 添加当前层级未排序的公式
          const remaining = formulas.filter(f => {
            const levelKey = `level${level + 1}Group` as keyof Formula;
            const currentValue = (f[levelKey] as string) || '';
            
            // 匹配父级路径
            const matchesParent = parentPath.every((pathPart, idx) => {
              const parentLevelKey = `level${idx + 1}Group` as keyof Formula;
              return ((f[parentLevelKey] as string) || '') === pathPart;
            });
            
            // 且当前层级值不在排序列表中
            return matchesParent && !currentLevelOrder.includes(currentValue);
          });
          sortedFormulas.push(...remaining);
        };
        
        // 从 L1 开始排序
        sortByLevels(0, []);
        
        // 添加未在排序中的公式
        const sortedIds = new Set(sortedFormulas.map(f => f.id));
        const remaining = formulas.filter(f => !sortedIds.has(f.id));
        sortedFormulas.push(...remaining);
        
        return {
          ...group,
          formulas: sortedFormulas,
        };
      }
      return group;
    });

    setGroups(updatedGroups);
    saveData(updatedGroups);
    setIsSortModalOpen(false);
  };

  const handleReorderRows = (groupId: string, draggedRowId: string, targetRowId: string) => {
    const updatedGroups = groups.map((group) => {
      if (group.id === groupId) {
        const formulas = [...group.formulas];
        const draggedIndex = formulas.findIndex(f => f.id === draggedRowId);
        const targetIndex = formulas.findIndex(f => f.id === targetRowId);
        
        if (draggedIndex === -1 || targetIndex === -1) return group;
        
        // 移除拖拽的元素
        const [draggedFormula] = formulas.splice(draggedIndex, 1);
        // 插入到目标位置
        formulas.splice(targetIndex, 0, draggedFormula);
        
        return {
          ...group,
          formulas,
        };
      }
      return group;
    });

    setGroups(updatedGroups);
    saveData(updatedGroups);
  };

  const handleEditFormula = (formula: Formula) => {
    setEditingFormula(formula);
    // 找到公式所属的分组
    const currentGroup = groups.find(g => g.formulas.some(f => f.id === formula.id));
    if (currentGroup) {
      // 找到根分组（顶级分组）
      let rootGroup = currentGroup;
      while (rootGroup.parentId) {
        const parent = groups.find(g => g.id === rootGroup.parentId);
        if (parent) {
          rootGroup = parent;
        } else {
          break;
        }
      }
      setFormulaForm({
        name: formula.name,
        englishFormula: formula.englishFormula,
        chineseFormula: formula.chineseFormula,
        description: formula.description || '',
        variableFormulaMapping: formula.variableFormulaMapping || {},
        subFormulas: formula.subFormulas || [],
        groupId: currentGroup.id,
        parentGroupId: rootGroup.id !== currentGroup.id ? rootGroup.id : null,
        level1Group: formula.level1Group || '',
        level2Group: formula.level2Group || '',
        level3Group: formula.level3Group || '',
        level4Group: formula.level4Group || '',
        level5Group: formula.level5Group || '',
        level6Group: formula.level6Group || '',
      });
    } else {
      setFormulaForm({
        name: formula.name,
        englishFormula: formula.englishFormula,
        chineseFormula: formula.chineseFormula,
        description: formula.description || '',
        variableFormulaMapping: formula.variableFormulaMapping || {},
        subFormulas: formula.subFormulas || [],
        groupId: null,
        parentGroupId: null,
        level1Group: (formula as any).level1Group || '',
        level2Group: (formula as any).level2Group || '',
        level3Group: (formula as any).level3Group || '',
        level4Group: (formula as any).level4Group || '',
        level5Group: (formula as any).level5Group || '',
        level6Group: (formula as any).level6Group || '',
      });
    }
    setIsCreateFormulaModalOpen(true);
  };

  const handleUpdateFormula = () => {
    if (!editingFormula) return;
    if (!formulaForm.name.trim() || !formulaForm.englishFormula.trim() || !formulaForm.chineseFormula.trim()) {
      toast.error('请填写所有字段');
      return;
    }

    const targetGroupId = formulaForm.groupId;
    if (!targetGroupId) {
      toast.error('请选择一个分组');
      return;
    }

    // 找到公式原来所在的分组
    const sourceGroup = groups.find(g => g.formulas.some(f => f.id === editingFormula.id));
    const targetGroup = groups.find(g => g.id === targetGroupId);

    // 如果目标分组存在，检查重名（排除自己）
    if (targetGroup) {
      const hasDuplicate = targetGroup.formulas.some(
        other => other.id !== editingFormula.id && other.name.toLowerCase() === formulaForm.name.trim().toLowerCase()
      );
      if (hasDuplicate) {
        toast.error('该分组下已存在同名公式');
        return;
      }
    }

    // 创建更新后的公式
    const updatedFormula = {
      ...editingFormula,
      name: formulaForm.name.trim(),
      englishFormula: formulaForm.englishFormula.trim(),
      chineseFormula: formulaForm.chineseFormula.trim(),
      description: formulaForm.description.trim(),
      variableFormulaMapping: formulaForm.variableFormulaMapping || {},
      subFormulas: formulaForm.subFormulas,
      // 更新分组字段
      level1Group: formulaForm.level1Group,
      level2Group: formulaForm.level2Group,
      level3Group: formulaForm.level3Group,
      level4Group: formulaForm.level4Group,
      level5Group: formulaForm.level5Group,
      level6Group: formulaForm.level6Group,
    };

    // 处理分组变更
    let updatedGroups = groups;
    if (sourceGroup && sourceGroup.id !== targetGroupId) {
      // 从原分组移除
      updatedGroups = groups.map(g => {
        if (g.id === sourceGroup.id) {
          return { ...g, formulas: g.formulas.filter(f => f.id !== editingFormula.id) };
        }
        if (g.id === targetGroupId) {
          return { ...g, formulas: [...g.formulas, updatedFormula] };
        }
        return g;
      });
    } else {
      // 同一分组内更新
      updatedGroups = groups.map(g => ({
        ...g,
        formulas: g.formulas.map((f) => {
          if (f.id === editingFormula.id) {
            return updatedFormula;
          }
          return f;
        }),
      }));
    }

    setGroups(updatedGroups);
    saveData(updatedGroups);
    setEditingFormula(null);
    setFormulaForm({ 
      name: '', 
      englishFormula: '', 
      chineseFormula: '', 
      description: '', 
      variableFormulaMapping: {}, 
      subFormulas: [], 
      groupId: null, 
      parentGroupId: null,
      level1Group: '',
      level2Group: '',
      level3Group: '',
      level4Group: '',
      level5Group: '',
      level6Group: '',
    });
    setIsCreateFormulaModalOpen(false);
  };

  // 全局键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 关闭弹窗
      if (e.key === 'Escape') {
        if (isCreateFormulaModalOpen) {
          setIsCreateFormulaModalOpen(false);
          setEditingFormula(null);
          setFormulaForm({ 
            name: '', 
            englishFormula: '', 
            chineseFormula: '', 
            description: '', 
            variableFormulaMapping: {}, 
            subFormulas: [], 
            groupId: null, 
            parentGroupId: null,
            level1Group: '',
            level2Group: '',
            level3Group: '',
            level4Group: '',
            level5Group: '',
            level6Group: '',
          });
        } else if (isCreateGroupModalOpen) {
          setIsCreateGroupModalOpen(false);
          setNewGroupName('');
        } else if (isDetailModalOpen) {
          setIsDetailModalOpen(false);
        } else if (isSortModalOpen) {
          setIsSortModalOpen(false);
        } else if (showUrlImportModal) {
          setShowUrlImportModal(false);
          setImportUrl('');
          setImportError('');
        }
      }
      
      // Enter 键触发确认按钮
      if (e.key === 'Enter' && !e.shiftKey) {
        // 创建/编辑公式
        if (isCreateFormulaModalOpen) {
          e.preventDefault();
          if (editingFormula) {
            handleUpdateFormula();
          } else {
            handleCreateFormula();
          }
        }
        // 创建分组
        else if (isCreateGroupModalOpen && newGroupName.trim()) {
          e.preventDefault();
          handleSaveGroup();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isCreateFormulaModalOpen,
    isCreateGroupModalOpen,
    isDetailModalOpen,
    isSortModalOpen,
    showUrlImportModal,
    editingFormula,
    newGroupName,
    handleCreateFormula,
    handleUpdateFormula,
    handleSaveGroup,
  ]);

  const handleExport = () => {
    try {
      downloadExportData(groups);
      toast.success('数据导出成功');
    } catch (error) {
      toast.error('导出失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedData = await importFromFile(file);
      setConfirmDialog({
        open: true,
        title: '确认导入',
        message: `即将导入 ${importedData.groups.length} 个分组，这将覆盖当前数据。确定继续吗？`,
        variant: 'default',
        onConfirm: () => {
          setGroups(importedData.groups);
          if (importedData.columnHeaders) {
            setColumnHeaders(importedData.columnHeaders);
          }
          saveData(importedData.groups, importedData.columnHeaders);
          
          // 选中第一个分组
          if (importedData.groups.length > 0) {
            setSelectedGroupId(importedData.groups[0].id);
          } else {
            setSelectedGroupId(null);
          }
          
          setImportError('');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setConfirmDialog(prev => ({ ...prev, open: false }));
        },
      });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '导入失败');
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      setImportError('请输入 URL');
      return;
    }
    setIsImporting(true);
    setImportError('');
    try {
      const importedData = await importFromUrl(importUrl.trim());
      setConfirmDialog({
        open: true,
        title: '确认导入',
        message: `即将导入 ${importedData.groups.length} 个分组，这将覆盖当前数据。确定继续吗？`,
        variant: 'default',
        onConfirm: () => {
          setGroups(importedData.groups);
          if (importedData.columnHeaders) {
            setColumnHeaders(importedData.columnHeaders);
          }
          saveData(importedData.groups, importedData.columnHeaders);
          
          // 选中第一个分组
          if (importedData.groups.length > 0) {
            setSelectedGroupId(importedData.groups[0].id);
          } else {
            setSelectedGroupId(null);
          }
          
          setImportError('');
          setShowUrlImportModal(false);
          setImportUrl('');
          setIsImporting(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        },
        onCancel: () => {
          setIsImporting(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        },
      });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '从 URL 导入失败');
      setIsImporting(false);
    }
  };

  const openFormulaModal = () => {
    if (!selectedGroupId) {
      toast.error('请先选择一个分组');
      return;
    }
    setEditingFormula(null);
    // 找到根分组
    let rootGroupId = selectedGroupId;
    let currentGroup = groups.find(g => g.id === selectedGroupId);
    while (currentGroup && currentGroup?.parentId) {
      const parent = groups.find(g => g.id === currentGroup?.parentId);
      if (parent) {
        rootGroupId = parent.id;
        currentGroup = parent;
      } else {
        break;
      }
    }
    setFormulaForm({
      name: '',
      englishFormula: '',
      chineseFormula: '',
      description: '',
      variableFormulaMapping: {},
      subFormulas: [],
      groupId: selectedGroupId,
      parentGroupId: rootGroupId !== selectedGroupId ? rootGroupId : null,
      level1Group: '',
      level2Group: '',
      level3Group: '',
      level4Group: '',
      level5Group: '',
      level6Group: '',
    });
    setIsCreateFormulaModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50">
      {/* 初始加载透明遮罩 */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[200] transition-opacity duration-300 ease-in-out">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
              <div className="absolute inset-2 border-4 border-blue-100 rounded-full animate-spin border-b-blue-500" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-700">正在加载数据</p>
              <p className="text-sm text-gray-500 mt-1">请稍候...</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 真实内容 */}
      <div 
        className="w-full max-w-full overflow-hidden transition-opacity duration-300 ease-in-out"
        style={{ 
          paddingTop: '0', 
          paddingBottom: '0',
          opacity: isLoading ? 0.3 : 1,
          pointerEvents: isLoading ? 'none' : 'auto'
        }}
      >
      {/* 云端加载提示 */}
      {cloudLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-2xl p-4 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">正在从云端加载数据</h3>
              <p className="text-sm text-gray-500 text-center">请稍候...</p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-full overflow-hidden" style={{ paddingTop: '0', paddingBottom: '0' }}>
        {/* 标题 */}
        <div className="mb-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        {importError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg">
            <p className="font-medium text-sm">导入失败</p>
            <p className="text-sm mt-1">{importError}</p>
          </div>
        )}

        <div className="flex gap-2.5" style={{ marginTop: '0' }}>
          {/* 表格视图 - 全屏显示 */}
          <div className="flex-1">
            <div className="bg-white shadow-sm border border-gray-200 overflow-hidden flex flex-col" style={{ height: '100vh' }}>
              {/* Sheet Tabs 和操作按钮 */}
              <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 flex-shrink-0">
                {/* 统一菜单按钮 */}
                <UnifiedMenuButton
                  groups={groups}
                  setGroups={setGroups}
                  setSelectedGroupId={setSelectedGroupId}
                  setSelectedFormulaId={setSelectedFormulaId}
                  onExport={handleExport}
                  onImport={() => fileInputRef.current?.click()}
                  onUrlImport={() => setShowUrlImportModal(true)}
                  fileInputRef={fileInputRef}
                  onEditColumnHeaders={handleOpenColumnHeadersEditor}
                />
                
                {/* Sheet Tabs */}
                <SheetTabs
                  groups={groups}
                  activeGroupId={selectedGroupId}
                  onSwitchSheet={setSelectedGroupId}
                  onCreateSheet={() => handleCreateGroup(null)}
                  onDeleteSheet={(groupId) => handleDeleteGroup(groupId)}
                  onRenameSheet={(groupId, newName) => handleEditGroup(groupId, newName)}
                  onReorderSheets={(newGroups) => {
                    setGroups(newGroups);
                    saveData(newGroups);
                  }}
                />
              </div>
              <FormulaSpreadsheet
                groups={groups}
                activeGroupId={selectedGroupId}
                onRowClick={handleSpreadsheetRowClick}
                onUpdateFormula={handleUpdateFormulaInSpreadsheet}
                onUpdateFormulas={handleUpdateFormulasInSpreadsheet}
                onAddFormula={() => {
                  if (selectedGroupId) {
                    handleAddFormulaToGroup(selectedGroupId);
                  }
                }}
                onDeleteFormula={handleDeleteFormula}
                onOpenSortModal={handleOpenSortModal}
                columnHeaders={columnHeaders}
                onColumnHeaderEdit={handleColumnHeaderEdit}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 公式详情弹窗 (Excel 视图) */}
      <FormulaDetailModal
        formula={detailFormula}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onSave={handleSaveFormulaDetail}
        allFormulas={groups.reduce((acc, group) => {
          group.formulas.forEach(f => {
            acc[f.id] = f;
          });
          return acc;
        }, {} as Record<string, Formula>)}
        groups={groups}
        columnHeaders={columnHeaders}
      />

      {/* 排序弹窗 */}
      <SortModal
        groups={groups}
        activeGroupId={selectedGroupId}
        isOpen={isSortModalOpen}
        onClose={() => setIsSortModalOpen(false)}
        onSave={handleSaveSortOrder}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        isOpen={pendingDeleteFormulaId !== null}
        onCancel={() => setPendingDeleteFormulaId(null)}
        onConfirm={confirmDeleteFormula}
        title="确认删除"
        message="确定要删除这个公式吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
      />

      {/* 编辑表头名称对话框 */}
      {showColumnHeadersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowColumnHeadersModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="px-2.5 py-2 border-b">
              <h3 className="text-lg font-semibold">编辑表头名称</h3>
              <p className="text-sm text-gray-500 mt-1">自定义表格列的显示名称，修改后会同步到所有相关表单</p>
            </div>
            <div className="p-2.5">
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'level1', default: '分组1', placeholder: '例如：模块' },
                  { key: 'level2', default: '分组2', placeholder: '例如：代码' },
                  { key: 'level3', default: '分组3', placeholder: '例如：全称' },
                  { key: 'level4', default: '分组4', placeholder: '例如：名称' },
                  { key: 'level5', default: '分组5', placeholder: '例如：条件' },
                  { key: 'level6', default: '分组6', placeholder: '例如：计算方' },
                ] as const).map(({ key, default: defaultLabel, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {defaultLabel}
                    </label>
                    <input
                      type="text"
                      value={editingColumnHeaders[key]}
                      onChange={(e) => setEditingColumnHeaders({ ...editingColumnHeaders, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowColumnHeadersModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveColumnHeaders}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 创建分组对话框 */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsCreateGroupModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-2.5 py-2 border-b">
              <h3 className="text-lg font-semibold">
                {newGroupParentId === null ? '创建新 Sheet' : '创建子分组'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {newGroupParentId === null 
                  ? '将创建顶级分组，显示在 Sheet 标签栏中' 
                  : `将创建为 "${groups.find(g => g.id === newGroupParentId)?.name}" 的子分组`}
              </p>
            </div>
            <div className="p-2.5">
              <input
                type="text"
                placeholder="例如：数学公式"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSaveGroup()}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreateGroupModalOpen(false);
                  setNewGroupName('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveGroup}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 创建/编辑公式对话框 */}
      {isCreateFormulaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/30" onClick={() => {
            setIsCreateFormulaModalOpen(false);
            setEditingFormula(null);
            setFormulaForm({ 
              name: '', 
              englishFormula: '', 
              chineseFormula: '', 
              description: '', 
              variableFormulaMapping: {}, 
              subFormulas: [], 
              groupId: null, 
              parentGroupId: null,
              level1Group: '',
              level2Group: '',
              level3Group: '',
              level4Group: '',
              level5Group: '',
              level6Group: '',
            });
          }} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingFormula ? '编辑公式' : '创建新公式'}
              </h3>
              <button
                onClick={() => {
                  setIsCreateFormulaModalOpen(false);
                  setEditingFormula(null);
                  setFormulaForm({ 
                    name: '', 
                    englishFormula: '', 
                    chineseFormula: '', 
                    description: '', 
                    variableFormulaMapping: {}, 
                    subFormulas: [], 
                    groupId: null, 
                    parentGroupId: null,
                    level1Group: '',
                    level2Group: '',
                    level3Group: '',
                    level4Group: '',
                    level5Group: '',
                    level6Group: '',
                  });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-2.5 space-y-2.5 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">英文公式</label>
                <input
                  type="text"
                  placeholder="例如：a+b+c*d"
                  value={formulaForm.englishFormula}
                  onChange={(e) => setFormulaForm({ ...formulaForm, englishFormula: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">中文公式</label>
                <input
                  type="text"
                  placeholder="例如：变量1+变量2+变量3*变量4"
                  value={formulaForm.chineseFormula}
                  onChange={(e) => setFormulaForm({ ...formulaForm, chineseFormula: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">说明（可选）</label>
                <textarea
                  placeholder="添加公式的详细说明、使用说明或备注..."
                  value={formulaForm.description}
                  onChange={(e) => setFormulaForm({ ...formulaForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {/* 分组字段自动补全 */}
              <AutocompleteInput
                label={columnHeaders?.level1 || '模块'}
                value={formulaForm.level1Group}
                onChange={(value) => setFormulaForm({ ...formulaForm, level1Group: value })}
                options={Array.from(new Set(
                  groups.flatMap(g => g.formulas)
                    .map((f: any) => f.level1Group)
                    .filter(Boolean)
                ))}
                placeholder={`请输入${columnHeaders?.level1 || '模块'}`}
              />
              <AutocompleteInput
                label={columnHeaders?.level2 || '代码'}
                value={formulaForm.level2Group}
                onChange={(value) => setFormulaForm({ ...formulaForm, level2Group: value })}
                options={Array.from(new Set(
                  groups.flatMap(g => g.formulas)
                    .map((f: any) => f.level2Group)
                    .filter(Boolean)
                ))}
                placeholder={`请输入${columnHeaders?.level2 || '代码'}`}
              />
              <AutocompleteInput
                label={columnHeaders?.level3 || '全称'}
                value={formulaForm.level3Group}
                onChange={(value) => setFormulaForm({ ...formulaForm, level3Group: value })}
                options={Array.from(new Set(
                  groups.flatMap(g => g.formulas)
                    .map((f: any) => f.level3Group)
                    .filter(Boolean)
                ))}
                placeholder={`请输入${columnHeaders?.level3 || '全称'}`}
              />
              <AutocompleteInput
                label={columnHeaders?.level4 || '名称'}
                value={formulaForm.level4Group}
                onChange={(value) => setFormulaForm({ ...formulaForm, level4Group: value })}
                options={Array.from(new Set(
                  groups.flatMap(g => g.formulas)
                    .map((f: any) => f.level4Group)
                    .filter(Boolean)
                ))}
                placeholder={`请输入${columnHeaders?.level4 || '名称'}`}
              />
              <AutocompleteInput
                label={columnHeaders?.level5 || '条件'}
                value={formulaForm.level5Group}
                onChange={(value) => setFormulaForm({ ...formulaForm, level5Group: value })}
                options={Array.from(new Set(
                  groups.flatMap(g => g.formulas)
                    .map((f: any) => f.level5Group)
                    .filter(Boolean)
                ))}
                placeholder={`请输入${columnHeaders?.level5 || '条件'}`}
              />
              <AutocompleteInput
                label={columnHeaders?.level6 || '计算方'}
                value={formulaForm.level6Group}
                onChange={(value) => setFormulaForm({ ...formulaForm, level6Group: value })}
                options={Array.from(new Set(
                  groups.flatMap(g => g.formulas)
                    .map((f: any) => f.level6Group)
                    .filter(Boolean)
                ))}
                placeholder={`请输入${columnHeaders?.level6 || '计算方'}`}
              />

              {/* 分组选择 */}
              <GroupSelector
                groups={groups}
                groupId={formulaForm.groupId}
                onChange={(parentId, childId) => {
                  setFormulaForm({
                    ...formulaForm,
                    parentGroupId: parentId,
                    groupId: childId
                  });
                }}
              />

              {/* 变量引用公式选择器 */}
              <FormulaReferenceSelector
                groups={groups}
                variableFormulaMapping={formulaForm.variableFormulaMapping}
                onChange={(mapping) => setFormulaForm({ ...formulaForm, variableFormulaMapping: mapping })}
                englishFormula={formulaForm.englishFormula}
                subFormulas={formulaForm.subFormulas}
              />

              {/* 子公式管理 */}
              <SubFormulaManager
                subFormulas={formulaForm.subFormulas || []}
                onChange={(subFormulas) => setFormulaForm({ ...formulaForm, subFormulas })}
              />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreateFormulaModalOpen(false);
                  setEditingFormula(null);
                  setFormulaForm({ 
                    name: '', 
                    englishFormula: '', 
                    chineseFormula: '', 
                    description: '', 
                    variableFormulaMapping: {}, 
                    subFormulas: [], 
                    groupId: null, 
                    parentGroupId: null,
                    level1Group: '',
                    level2Group: '',
                    level3Group: '',
                    level4Group: '',
                    level5Group: '',
                    level6Group: '',
                  });
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={editingFormula ? handleUpdateFormula : handleCreateFormula}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                {editingFormula ? '更新' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URL 导入弹窗 */}
      {showUrlImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-2.5 py-2 border-b">
              <h3 className="text-lg font-semibold text-gray-900">从 URL 导入数据</h3>
            </div>
            <div className="p-2.5">
              <p className="text-sm text-gray-600 mb-4">
                点击复制示例数据 URL：
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://formula-mapper.netlify.app/demo-data.json');
                    setImportUrl('https://formula-mapper.netlify.app/demo-data.json');  
                  }}
                  className="text-blue-600 hover:text-blue-800 underline ml-1"
                >
                  /demo-data.json
                </button>
              </p>
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/data.json"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && !isImporting && handleImportFromUrl()}
              />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUrlImportModal(false);
                  setImportUrl('');
                  setImportError('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImportFromUrl}
                disabled={isImporting}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isImporting && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isImporting ? '导入中...' : '导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="确定"
        cancelText="取消"
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel || (() => setConfirmDialog(prev => ({ ...prev, open: false })))}
      />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <HomeContent />
    </Suspense>
  );
}
