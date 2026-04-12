'use client';

import { useEffect } from 'react';
import { FormulaGroup } from '@/lib/types';

interface VersionPreviewWindowProps {
  versionId: string;
  savedAt: string;
  groups: FormulaGroup[];
  config: {
    endpoint: string;
    apiKey?: string;
    namespaceId?: string;
  };
  onClose: () => void;
}

export function VersionPreviewWindow({ versionId, savedAt, groups, onClose }: VersionPreviewWindowProps) {
  useEffect(() => {
    // 将数据存储到 localStorage
    const storageKey = `version_preview_${versionId}`;
    localStorage.setItem(storageKey, JSON.stringify({ versionId, savedAt, groups }));
    
    // 打开新窗口并导航到预览页面
    const width = screen.width - 100;
    const height = screen.height - 100;
    const left = 50;
    const top = 50;
    
    const previewUrl = `/version-preview?id=${versionId}`;
    const newWindow = window.open(
      previewUrl,
      `_version_preview_${versionId}`,
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!newWindow) {
      alert('无法打开预览窗口，请检查浏览器弹窗设置');
      onClose();
      return;
    }

    // 监听窗口关闭
    const checkClosed = setInterval(() => {
      if (newWindow.closed) {
        clearInterval(checkClosed);
        // 清理 localStorage
        localStorage.removeItem(storageKey);
        onClose();
      }
    }, 500);

    return () => {
      clearInterval(checkClosed);
      // 清理 localStorage
      localStorage.removeItem(storageKey);
    };
  }, [versionId, groups, onClose]);

  return null;
}
