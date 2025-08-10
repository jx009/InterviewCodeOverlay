#!/usr/bin/env python3
"""
GitHub Artifacts 清理脚本
快速清理所有artifacts以释放存储空间
"""

import requests
import sys
import time

# GitHub配置
REPO_OWNER = "jx009"
REPO_NAME = "InterviewCodeOverlay"
BASE_URL = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}"

def clear_artifacts(token):
    """清理所有artifacts"""
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'artifacts-cleaner'
    }
    
    print("🔍 获取artifacts列表...")
    
    # 获取所有artifacts
    response = requests.get(f"{BASE_URL}/actions/artifacts?per_page=100", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ 错误: {response.status_code} - {response.text}")
        return False
    
    data = response.json()
    artifacts = data.get('artifacts', [])
    
    print(f"📦 找到 {len(artifacts)} 个artifacts")
    
    if not artifacts:
        print("✅ 没有artifacts需要清理")
        return True
    
    # 显示artifacts信息
    total_size = 0
    for i, artifact in enumerate(artifacts, 1):
        size_mb = artifact['size_in_bytes'] / 1024 / 1024
        total_size += size_mb
        print(f"{i:2d}. {artifact['name']} ({size_mb:.1f}MB) - {artifact['created_at'][:10]}")
    
    print(f"\n💾 总大小: {total_size:.1f}MB")
    print("\n🗑️ 开始删除artifacts...")
    
    # 删除所有artifacts
    deleted_count = 0
    failed_count = 0
    
    for i, artifact in enumerate(artifacts, 1):
        try:
            delete_response = requests.delete(
                f"{BASE_URL}/actions/artifacts/{artifact['id']}", 
                headers=headers
            )
            
            if delete_response.status_code == 204:
                print(f"✅ [{i:2d}/{len(artifacts)}] 已删除: {artifact['name']}")
                deleted_count += 1
            else:
                print(f"❌ [{i:2d}/{len(artifacts)}] 删除失败: {artifact['name']} (HTTP {delete_response.status_code})")
                failed_count += 1
                
        except Exception as e:
            print(f"❌ [{i:2d}/{len(artifacts)}] 删除失败: {artifact['name']} - {str(e)}")
            failed_count += 1
        
        # 添加小延迟避免API限制
        time.sleep(0.1)
    
    print(f"\n🎉 清理完成!")
    print(f"✅ 成功删除: {deleted_count} 个artifacts")
    if failed_count > 0:
        print(f"❌ 删除失败: {failed_count} 个artifacts")
    
    print(f"💾 释放空间: ~{total_size:.1f}MB")
    
    return deleted_count > 0

def main():
    if len(sys.argv) != 2:
        print("❌ 用法: python clear-artifacts.py <GITHUB_TOKEN>")
        print("\n📝 获取GitHub Token:")
        print("1. 访问: https://github.com/settings/tokens")
        print("2. 点击 'Generate new token (classic)'")
        print("3. 选择权限: repo, workflow, delete:packages")
        print("4. 复制生成的token")
        print("\n🚀 然后运行: python clear-artifacts.py YOUR_TOKEN")
        sys.exit(1)
    
    token = sys.argv[1]
    
    print("🧹 GitHub Artifacts 清理工具")
    print("=" * 50)
    
    success = clear_artifacts(token)
    
    if success:
        print("\n✅ 清理完成！现在可以重新运行GitHub Actions了。")
        print("⏰ 建议等待5-10分钟让GitHub更新存储配额统计。")
    else:
        print("\n❌ 清理失败，请检查token权限或手动删除。")

if __name__ == "__main__":
    main()