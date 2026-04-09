/**
 * 数据处理 Web Worker
 * 用于处理大数据的 JSON 解析和序列化，避免阻塞主线程
 */

self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  try {
    switch (type) {
      case 'parse':
        // 解析 JSON
        const parsed = JSON.parse(data);
        self.postMessage({ 
          type: 'parsed', 
          success: true, 
          result: parsed 
        });
        break;

      case 'stringify':
        // 序列化 JSON
        const stringified = JSON.stringify(data, null, 2);
        self.postMessage({ 
          type: 'stringified', 
          success: true, 
          result: stringified 
        });
        break;

      case 'process-import':
        // 处理导入数据
        const imported = JSON.parse(data.json);
        const processed = {
          groups: imported.groups || [],
          columnHeaders: imported.columnHeaders || {},
          timestamp: Date.now()
        };
        self.postMessage({
          type: 'import-processed',
          success: true,
          result: processed
        });
        break;

      case 'process-export':
        // 处理导出数据
        const exportData = {
          groups: data.groups,
          columnHeaders: data.columnHeaders,
          exportedAt: new Date().toISOString(),
          version: '1.0'
        };
        const exportJson = JSON.stringify(exportData, null, 2);
        self.postMessage({
          type: 'export-processed',
          success: true,
          result: exportJson
        });
        break;

      default:
        self.postMessage({ 
          type: 'error', 
          success: false, 
          error: `Unknown message type: ${type}` 
        });
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export {};
