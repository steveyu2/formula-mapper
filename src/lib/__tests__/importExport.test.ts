import { 
  exportData, 
  downloadExportData, 
  importData, 
  importFromFile,
  importFromUrl,
  ExportData 
} from '../importExport';
import { FormulaGroup } from '../types';

describe('Import/Export Module', () => {
  describe('exportData', () => {
    it('should export data with correct structure', () => {
      const groups: FormulaGroup[] = [
        {
          id: '1',
          name: 'Group 1',
          parentId: null,
          formulas: [
            {
              id: 'f1',
              name: 'Formula 1',
              englishFormula: 'a + b',
              chineseFormula: '变量a + 变量b',
              createdAt: Date.now(),
            },
          ],
          createdAt: Date.now(),
        },
      ];

      const json = exportData(groups);
      const data: ExportData = JSON.parse(json);

      expect(data.version).toBe('1.0');
      expect(data.exportDate).toBeDefined();
      expect(data.groups).toHaveLength(1);
    });

    it('should export empty groups', () => {
      const json = exportData([]);
      const data: ExportData = JSON.parse(json);

      expect(data.version).toBe('1.0');
      expect(data.groups).toEqual([]);
    });

    it('should export multiple groups', () => {
      const groups: FormulaGroup[] = [
        {
          id: '1',
          name: 'Group 1',
          parentId: null,
          formulas: [],
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: 'Group 2',
          parentId: null,
          formulas: [],
          createdAt: Date.now(),
        },
      ];

      const json = exportData(groups);
      const data: ExportData = JSON.parse(json);

      expect(data.groups).toHaveLength(2);
    });

    it('should export data with proper JSON formatting', () => {
      const groups: FormulaGroup[] = [];
      const json = exportData(groups);

      expect(json).toContain('"version"');
      expect(json).toContain('"exportDate"');
      expect(json).toContain('"groups"');
    });

    it('should include export timestamp', () => {
      const before = new Date();
      const json = exportData([]);
      const data: ExportData = JSON.parse(json);
      const after = new Date();

      const exportDate = new Date(data.exportDate);
      expect(exportDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(exportDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should preserve all formula properties', () => {
      const now = Date.now();
      const groups: FormulaGroup[] = [
        {
          id: '1',
          name: 'Group',
          parentId: null,
          formulas: [
            {
              id: 'f1',
              name: 'Formula',
              englishFormula: 'a + b',
              chineseFormula: '中文',
              description: '测试',
              createdAt: now,
              variableFormulaMapping: { 'a': 'f2' },
              subFormulas: [
                {
                  id: 'sf1',
                  name: 'SubFormula',
                  englishFormula: 'x * y',
                  chineseFormula: 'x * y',
                },
              ],
            },
          ],
          createdAt: now,
        },
      ];

      const json = exportData(groups);
      const data: ExportData = JSON.parse(json);

      expect(data.groups[0].formulas[0].description).toBe('测试');
      expect(data.groups[0].formulas[0].variableFormulaMapping).toEqual({ 'a': 'f2' });
      expect(data.groups[0].formulas[0].subFormulas).toHaveLength(1);
    });
  });

  describe('importData', () => {
    it('should import valid data', () => {
      const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        groups: [
          {
            id: '1',
            name: 'Group 1',
            parentId: null,
            formulas: [],
            createdAt: Date.now(),
          },
        ],
      };

      const json = JSON.stringify(exportData);
      const imported = importData(json);

      expect(imported).toHaveLength(1);
      expect(imported[0].name).toBe('Group 1');
    });

    it('should import empty groups', () => {
      const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        groups: [],
      };

      const json = JSON.stringify(exportData);
      const imported = importData(json);

      expect(imported).toEqual([]);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => {
        importData('invalid json');
      }).toThrow();
    });

    it('should throw error for missing version', () => {
      const invalidData = {
        exportDate: new Date().toISOString(),
        groups: [],
      };

      expect(() => {
        importData(JSON.stringify(invalidData));
      }).toThrow('无效的数据格式');
    });

    it('should throw error for missing groups', () => {
      const invalidData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
      };

      expect(() => {
        importData(JSON.stringify(invalidData));
      }).toThrow('无效的数据格式');
    });

    it('should throw error for invalid group structure', () => {
      const invalidData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        groups: [
          {
            // Missing required fields
            id: '1',
          } as any,
        ],
      };

      expect(() => {
        importData(JSON.stringify(invalidData));
      }).toThrow();
    });

    it('should throw error for invalid formula structure', () => {
      const invalidData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        groups: [
          {
            id: '1',
            name: 'Group',
            parentId: null,
            formulas: [
              {
                id: 'f1',
                name: 'Formula',
                // Missing englishFormula and chineseFormula
              } as any,
            ],
            createdAt: Date.now(),
          },
        ],
      };

      expect(() => {
        importData(JSON.stringify(invalidData));
      }).toThrow();
    });

    it('should preserve all properties after import', () => {
      const now = Date.now();
      const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        groups: [
          {
            id: '1',
            name: 'Group',
            parentId: 'parent',
            formulas: [
              {
                id: 'f1',
                name: 'Formula',
                englishFormula: 'a + b',
                chineseFormula: '中文',
                description: '测试',
                createdAt: now,
                variableFormulaMapping: { 'a': 'f2' },
                subFormulas: [
                  {
                    id: 'sf1',
                    name: 'SubFormula',
                    englishFormula: 'x',
                    chineseFormula: 'x',
                  },
                ],
              },
            ],
            createdAt: now,
          },
        ],
      };

      const json = JSON.stringify(exportData);
      const imported = importData(json);

      expect(imported[0]).toEqual(exportData.groups[0]);
    });

    it('should handle multiple groups in import', () => {
      const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        groups: [
          {
            id: '1',
            name: 'Group 1',
            parentId: null,
            formulas: [],
            createdAt: Date.now(),
          },
          {
            id: '2',
            name: 'Group 2',
            parentId: null,
            formulas: [],
            createdAt: Date.now(),
          },
        ],
      };

      const json = JSON.stringify(exportData);
      const imported = importData(json);

      expect(imported).toHaveLength(2);
      expect(imported.map(g => g.name)).toEqual(['Group 1', 'Group 2']);
    });
  });

  describe('downloadExportData', () => {
    // Note: downloadExportData creates a file download, which is harder to test
    // We're testing that it doesn't throw errors for valid input
    
    it('should not throw error for valid data', () => {
      const groups: FormulaGroup[] = [];
      
      // Mock URL.createObjectURL and URL.revokeObjectURL
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;

      (URL as any).createObjectURL = jest.fn(() => 'blob:mock-url');
      (URL as any).revokeObjectURL = jest.fn();
      
      // Mock document methods
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'appendChild').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'removeChild').mockReturnValue(mockLink as any);

      try {
        downloadExportData(groups, 'test.json');
      } finally {
        // Restore original functions
        (URL as any).createObjectURL = originalCreateObjectURL;
        (URL as any).revokeObjectURL = originalRevokeObjectURL;
      }
    });
  });

  describe('importFromFile', () => {
    it('should parse valid file content', async () => {
      const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        groups: [
          {
            id: '1',
            name: 'Group',
            parentId: null,
            formulas: [],
            createdAt: Date.now(),
          },
        ],
      };

      const content = JSON.stringify(exportData);
      const file = new File([content], 'test.json');

      const result = await importFromFile(file);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Group');
    });

    it('should throw error for invalid file content', async () => {
      const file = new File(['invalid content'], 'test.json');

      await expect(importFromFile(file)).rejects.toThrow();
    });

    it('should handle empty file', async () => {
      const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        groups: [],
      };

      const file = new File([JSON.stringify(exportData)], 'empty.json');
      const result = await importFromFile(file);

      expect(result).toEqual([]);
    });
  });

  describe('importFromUrl', () => {
    it('should fetch and import data from URL', async () => {
      const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        groups: [
          {
            id: '1',
            name: 'Group',
            parentId: null,
            formulas: [],
            createdAt: Date.now(),
          },
        ],
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(exportData)),
        } as Response)
      );

      const result = await importFromUrl('http://example.com/data.json');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Group');
    });

    it('should throw error for HTTP errors', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response)
      );

      await expect(importFromUrl('http://example.com/data.json')).rejects.toThrow('HTTP 错误');
    });

    it('should throw error for network failures', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      await expect(importFromUrl('http://example.com/data.json')).rejects.toThrow('网络请求失败');
    });

    it('should throw error for invalid JSON from URL', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('invalid json'),
        } as Response)
      );

      await expect(importFromUrl('http://example.com/data.json')).rejects.toThrow();
    });
  });

  describe('round-trip testing', () => {
    it('should export and import data without loss', () => {
      const now = Date.now();
      const originalGroups: FormulaGroup[] = [
        {
          id: '1',
          name: 'Group 1',
          parentId: null,
          formulas: [
            {
              id: 'f1',
              name: 'Formula 1',
              englishFormula: 'a + b * c',
              chineseFormula: '变量a + 变量b * 变量c',
              description: 'Test formula',
              createdAt: now,
              variableFormulaMapping: { 'a': 'f2', 'b': 'f3' },
            },
            {
              id: 'f2',
              name: 'Formula 2',
              englishFormula: 'x / y',
              chineseFormula: '变量x / 变量y',
              createdAt: now,
            },
          ],
          createdAt: now,
        },
      ];

      const json = exportData(originalGroups);
      const imported = importData(json);

      expect(imported).toEqual(originalGroups);
    });
  });
});
