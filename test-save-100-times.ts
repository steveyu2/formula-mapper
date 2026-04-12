/**
 * 测试脚本：自动保存100次数据到云端
 * 用于测试历史版本双类型管理功能
 */

const ENDPOINT = 'https://formula-mapper-sync.methree.workers.dev';
const WRITE_PASSWORD = '1111';
const SAVE_COUNT = 100;

// 模拟数据
const mockData = {
  version: '1.0',
  timestamp: Date.now(),
  groups: [
    {
      id: 'test-group-1',
      name: '测试分组',
      formulas: [
        {
          id: 'formula-1',
          name: '测试公式',
          englishFormula: 'A1 + B1',
          chineseFormula: '变量1 + 变量2',
          description: '这是一个测试公式',
          level1Group: '测试分组',
        }
      ]
    }
  ],
  metadata: {
    deviceId: 'test-script',
    userAgent: 'test-script',
  }
};

async function saveData(index: number): Promise<boolean> {
  try {
    const response = await fetch(`${ENDPOINT}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Write-Password': WRITE_PASSWORD,
      },
      body: JSON.stringify({
        key: 'formula-data',
        data: {
          ...mockData,
          timestamp: Date.now(),
          groups: mockData.groups.map(g => ({
            ...g,
            formulas: g.formulas.map(f => ({
              ...f,
              description: `${f.description} (第${index}次保存)`,
            }))
          }))
        },
        comment: `测试保存 #${index}`,
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ 第 ${index}/${SAVE_COUNT} 次保存成功`);
      return true;
    } else {
      console.error(`❌ 第 ${index}/${SAVE_COUNT} 次保存失败:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ 第 ${index}/${SAVE_COUNT} 次保存异常:`, error);
    return false;
  }
}

async function runTest() {
  console.log(`🚀 开始测试：自动保存 ${SAVE_COUNT} 次数据`);
  console.log(`📍 端点: ${ENDPOINT}`);
  console.log(`🔑 密码: ${WRITE_PASSWORD}`);
  console.log('─'.repeat(50));

  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  for (let i = 1; i <= SAVE_COUNT; i++) {
    const success = await saveData(i);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // 每10次显示统计
    if (i % 10 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n📊 进度: ${i}/${SAVE_COUNT} | 成功: ${successCount} | 失败: ${failCount} | 耗时: ${elapsed}s\n`);
    }
    
    // 避免请求过快，等待100ms
    if (i < SAVE_COUNT) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('═'.repeat(50));
  console.log('🎉 测试完成！');
  console.log(`✅ 成功: ${successCount}/${SAVE_COUNT}`);
  console.log(`❌ 失败: ${failCount}/${SAVE_COUNT}`);
  console.log(`⏱️  总耗时: ${totalTime}s`);
  console.log('═'.repeat(50));
  
  // 查询版本历史
  console.log('\n📋 正在查询版本历史...');
  try {
    const versionsResponse = await fetch(`${ENDPOINT}/versions?key=formula-data`);
    const versionsResult = await versionsResponse.json();
    
    if (versionsResult.success) {
      const fixedVersions = versionsResult.versions.filter((v: any) => v.versionType === 'fixed');
      const autoVersions = versionsResult.versions.filter((v: any) => v.versionType === 'auto' || !v.versionType);
      
      console.log('\n📊 版本统计:');
      console.log(`  📌 固定版本: ${fixedVersions.length}/100`);
      console.log(`  📅 自动版本: ${autoVersions.length}/100`);
      console.log(`  📦 总计: ${versionsResult.versions.length}/200`);
      
      if (fixedVersions.length > 0) {
        console.log('\n📌 最新固定版本:');
        console.log(`  ID: ${fixedVersions[0].versionId}`);
        console.log(`  时间: ${fixedVersions[0].savedAt}`);
        console.log(`  备注: ${fixedVersions[0].comment || '无'}`);
      }
      
      if (autoVersions.length > 0) {
        console.log('\n📅 最新自动版本:');
        console.log(`  ID: ${autoVersions[0].versionId}`);
        console.log(`  时间: ${autoVersions[0].savedAt}`);
      }
    }
  } catch (error) {
    console.error('❌ 查询版本历史失败:', error);
  }
}

// 运行测试
runTest().catch(console.error);
